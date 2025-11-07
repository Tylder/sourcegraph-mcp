/**
 * File blame tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { FILE_BLAME_QUERY } from '../../graphql/queries/blame.js';

export interface FileBlameParams {
  repo: string;
  path: string;
  rev?: string;
  startLine?: number;
  endLine?: number;
}

interface BlamePerson {
  displayName: string | null;
  email: string | null;
}

interface BlameAuthor {
  date: string | null;
  person: BlamePerson | null;
}

interface BlameCommit {
  oid: string;
  abbreviatedOID: string | null;
  url: string;
  subject: string | null;
}

interface BlameRange {
  startLine: number;
  endLine: number;
  author: BlameAuthor | null;
  commit: BlameCommit | null;
}

interface BlameData {
  ranges: BlameRange[];
}

interface FileBlameBlob {
  path: string | null;
  blame: BlameData | null;
}

interface FileBlameCommit {
  oid: string;
  blob: FileBlameBlob | null;
}

interface FileBlameRepository {
  name: string;
  url: string;
  commit: FileBlameCommit | null;
}

interface FileBlameResponse {
  repository: FileBlameRepository | null;
}

const TABLE_HEADER = 'Line | Commit | Author | Date | Subject | URL';
const HEADER_SEPARATOR = '-'.repeat(TABLE_HEADER.length);

function formatAuthor(range: BlameRange): string {
  const displayName = range.author?.person?.displayName?.trim();
  const email = range.author?.person?.email?.trim();
  const name = displayName ?? email ?? 'Unknown author';
  const emailSuffix = email ? ` <${email}>` : '';
  return `${name}${emailSuffix}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown date';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatSubject(subject: string | null | undefined): string {
  if (!subject) {
    return 'No subject';
  }
  const normalized = subject.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : 'No subject';
}

function formatUrl(url: string | null | undefined): string {
  if (!url) {
    return 'No URL';
  }
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : 'No URL';
}

function isValidRange(range: BlameRange): boolean {
  return Number.isFinite(range.startLine) && Number.isFinite(range.endLine);
}

export async function fileBlame(
  client: SourcegraphClient,
  params: FileBlameParams
): Promise<string> {
  const { repo, path, rev, startLine, endLine } = params;

  if (
    typeof startLine === 'number' &&
    typeof endLine === 'number' &&
    Number.isFinite(startLine) &&
    Number.isFinite(endLine) &&
    startLine > endLine
  ) {
    return 'Invalid blame range: startLine must be less than or equal to endLine.';
  }

  const variables: {
    repo: string;
    path: string;
    rev?: string;
    startLine?: number;
    endLine?: number;
  } = {
    repo,
    path,
  };

  if (rev) {
    variables.rev = rev;
  }
  if (typeof startLine === 'number' && Number.isFinite(startLine)) {
    variables.startLine = startLine;
  }
  if (typeof endLine === 'number' && Number.isFinite(endLine)) {
    variables.endLine = endLine;
  }

  try {
    const response = await client.query<FileBlameResponse>(FILE_BLAME_QUERY, variables);

    if (!response.repository) {
      return `Repository ${repo} not found.`;
    }

    const commit = response.repository.commit;
    const revisionLabel = rev ?? 'HEAD';

    if (!commit) {
      return `Revision ${revisionLabel} not found in ${repo}.`;
    }

    const blob = commit.blob;

    if (!blob) {
      return `File ${path} not found at ${revisionLabel} in ${repo}.`;
    }

    const blame = blob.blame;
    const metadataLines: string[] = [
      `Repository: ${response.repository.name}`,
      `Repository URL: ${response.repository.url}`,
      `Path: ${blob.path ?? path}`,
      `Revision Requested: ${revisionLabel}`,
      `Revision OID: ${commit.oid}`,
    ];

    if (!blame || blame.ranges.length === 0) {
      metadataLines.push('', 'No blame information available for the requested range.');
      return metadataLines.join('\n');
    }

    metadataLines.push('', TABLE_HEADER, HEADER_SEPARATOR);

    let hasLines = false;

    for (const range of blame.ranges) {
      if (!isValidRange(range)) {
        continue;
      }

      const commitInfo = range.commit;
      const commitLabel = commitInfo?.abbreviatedOID ?? commitInfo?.oid ?? 'unknown';
      const subject = formatSubject(commitInfo?.subject);
      const url = formatUrl(commitInfo?.url);
      const author = formatAuthor(range);
      const timestamp = formatDate(range.author?.date);

      for (let lineNumber = range.startLine; lineNumber <= range.endLine; lineNumber += 1) {
        metadataLines.push(
          `${String(lineNumber)} | ${commitLabel} | ${author} | ${timestamp} | ${subject} | ${url}`
        );
        hasLines = true;
      }
    }

    if (!hasLines) {
      metadataLines.push('No blame information available for the requested range.');
    }

    return metadataLines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error retrieving blame information: ${message}`;
  }
}
