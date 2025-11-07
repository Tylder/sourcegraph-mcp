import type { SourcegraphClient } from '../../graphql/client.js';
import { REPO_COMPARISON_QUERY } from '../../graphql/queries/repos.js';

interface CommitAuthor {
  person?: {
    displayName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  date?: string | null;
}

interface ComparisonCommit {
  oid: string;
  abbreviatedOID?: string | null;
  subject?: string | null;
  author?: CommitAuthor | null;
  url?: string | null;
}

interface ComparisonHunkRange {
  startLine?: number | null;
  lines?: number | null;
}

interface ComparisonHunk {
  oldRange?: ComparisonHunkRange | null;
  newRange?: ComparisonHunkRange | null;
  body: string;
}

interface ComparisonFileDiffStat {
  added?: number | null;
  changed?: number | null;
  deleted?: number | null;
}

interface ComparisonFileDiff {
  oldPath?: string | null;
  newPath?: string | null;
  stat?: ComparisonFileDiffStat | null;
  hunks: ComparisonHunk[];
}

interface RepoComparisonResponse {
  repository: {
    name: string;
    comparison: {
      commits: {
        nodes: ComparisonCommit[];
        totalCount: number | null;
      };
      fileDiffs: {
        nodes: ComparisonFileDiff[];
        totalCount: number | null;
      };
    } | null;
  } | null;
}

/**
 * Parameters accepted by the {@link repoCompareCommits} tool.
 */
export interface RepoCompareCommitsParams {
  /** Fully qualified repository name (for example, `github.com/sourcegraph/sourcegraph`). */
  repo: string;
  /** Base revision to compare against (commit ID, branch name, or tag). */
  baseRev: string;
  /** Head revision to compare with (commit ID, branch name, or tag). */
  headRev: string;
}

const DEFAULT_COMMIT_LIMIT = 20;
const DEFAULT_DIFF_LIMIT = 20;
const MAX_HUNK_LINES = 8;

function resolveAuthor(author: CommitAuthor | null | undefined): string {
  if (!author) {return 'Unknown';}
  const { person } = author;
  const name = [person?.displayName, person?.name, person?.email]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value && value.length > 0));
  const date = author.date?.trim();
  if (name && date) {return `${name} (${date})`;}
  if (name) {return name;}
  if (date) {return date;}
  return 'Unknown';
}

function formatRange(range: ComparisonHunkRange | null | undefined, prefix: string): string {
  if (range?.startLine == null) {return `${prefix}∅`;}
  if (range.lines == null) {return `${prefix}${range.startLine.toString()}`;}
  return `${prefix}${range.startLine.toString()},${range.lines.toString()}`;
}

function describeDiff(diff: ComparisonFileDiff): string {
  const { oldPath, newPath } = diff;
  if (oldPath && newPath && oldPath !== newPath) {return `renamed from ${oldPath} to ${newPath}`;}
  if (!oldPath && newPath) {return `added ${newPath}`;}
  if (oldPath && !newPath) {return `deleted ${oldPath}`;}
  const target = newPath ?? oldPath;
  return target ? `modified ${target}` : 'modified unknown file';
}

function summariseHunk(hunk: ComparisonHunk, index: number): string[] {
  const summary: string[] = [];
  const oldLabel = formatRange(hunk.oldRange, '-');
  const newLabel = formatRange(hunk.newRange, '+');
  summary.push(`     Hunk ${(index + 1).toString()}: ${oldLabel} ${newLabel}`);
  const rawLines = hunk.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  rawLines.slice(0, MAX_HUNK_LINES).forEach((line) => {
    summary.push(`       ${line}`);
  });
  if (rawLines.length > MAX_HUNK_LINES) {
    summary.push('       …');
  }
  return summary;
}

function summariseFileDiff(diff: ComparisonFileDiff, index: number): string[] {
  const descriptor = describeDiff(diff);
  const lines = [`  ${(index + 1).toString()}. ${descriptor}`];
  const stat: ComparisonFileDiffStat = diff.stat ?? {};
  const statParts: string[] = [];
  if (typeof stat.added === 'number') {
    statParts.push(`+${stat.added.toString()}`);
  }
  if (typeof stat.changed === 'number') {
    statParts.push(`~${stat.changed.toString()}`);
  }
  if (typeof stat.deleted === 'number') {
    statParts.push(`-${stat.deleted.toString()}`);
  }
  if (statParts.length > 0) {
    lines.push(`     Stats: ${statParts.join(' ')}`);
  } else {
    lines.push('     Stats: unavailable.');
  }
  if (!diff.hunks.length) {
    lines.push('     No diff hunks available (file may be binary or diff omitted).');
    return lines;
  }
  diff.hunks.forEach((hunk, hunkIndex) => {
    lines.push(...summariseHunk(hunk, hunkIndex));
  });
  return lines;
}

function summariseCommit(commit: ComparisonCommit, index: number): string[] {
  const identifier = commit.abbreviatedOID ?? commit.oid;
  const trimmedSubject = commit.subject?.trim();
  const subject = trimmedSubject && trimmedSubject.length > 0 ? trimmedSubject : '(no subject)';
  const lines = [`  ${(index + 1).toString()}. ${identifier} - ${subject}`];
  lines.push(`     Author: ${resolveAuthor(commit.author)}`);
  if (commit.url) {
    lines.push(`     URL: ${commit.url}`);
  }
  return lines;
}

/**
 * Compares two revisions in a repository and summarises the commits and file diffs.
 *
 * @param client - Configured Sourcegraph GraphQL client used to execute the comparison query.
 * @param params - {@link RepoCompareCommitsParams} describing the repository and revisions to compare.
 * @returns A formatted, human-readable summary suitable for MCP text responses.
 *
 * @example
 * ```ts
 * await repoCompareCommits(client, {
 *   repo: 'github.com/sourcegraph/sourcegraph',
 *   baseRev: 'main',
 *   headRev: 'feature-branch',
 * });
 * ```
 *
 * @remarks
 * - GraphQL query: {@link REPO_COMPARISON_QUERY}
 * - Error handling: returns descriptive strings when revisions are missing, the repository is not found, or the query fails.
 */
export async function repoCompareCommits(
  client: SourcegraphClient,
  params: RepoCompareCommitsParams,
): Promise<string> {
  const repo = params.repo.trim();
  const base = params.baseRev.trim();
  const head = params.headRev.trim();

  if (!repo) {
    return 'Repository name is required.';
  }

  if (!base) {
    return 'Base revision is required for comparison.';
  }

  if (!head) {
    return 'Head revision is required for comparison.';
  }

  try {
    const variables = {
      name: repo,
      base,
      head,
      firstCommits: DEFAULT_COMMIT_LIMIT,
      firstDiffs: DEFAULT_DIFF_LIMIT,
    };

    const response = await client.query<RepoComparisonResponse>(
      REPO_COMPARISON_QUERY as string,
      variables,
    );

    if (!response.repository) {
      return `Repository not found: ${repo}`;
    }

    const { comparison } = response.repository;

    if (!comparison) {
      return `No comparison available between ${base} and ${head} in ${repo}.`;
    }

    const lines: string[] = [];
    lines.push(`Repository: ${response.repository.name}`);
    lines.push(`Base Revision: ${base}`);
    lines.push(`Head Revision: ${head}`);

    lines.push('');

    const commitNodes = comparison.commits.nodes;
    const commitTotal = comparison.commits.totalCount?.toString() ?? 'unknown';
    lines.push(`Commits: showing ${commitNodes.length.toString()} of ${commitTotal} total`);

    if (commitNodes.length === 0) {
      lines.push('  No commits found in this comparison.');
    } else {
      commitNodes.forEach((commit, index) => {
        lines.push(...summariseCommit(commit, index));
      });
    }

    lines.push('');

    const fileDiffNodes = comparison.fileDiffs.nodes;
    const diffTotal = comparison.fileDiffs.totalCount?.toString() ?? 'unknown';
    lines.push(`File Diffs: showing ${fileDiffNodes.length.toString()} of ${diffTotal} total`);

    if (fileDiffNodes.length === 0) {
      lines.push('  No file changes detected between the revisions.');
    } else {
      fileDiffNodes.forEach((diff, index) => {
        lines.push(...summariseFileDiff(diff, index));
      });
    }

    lines.push('');

    return `${lines.join('\n')}\n`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error comparing revisions: ${message}`;
  }
}
