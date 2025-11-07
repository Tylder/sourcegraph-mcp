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

interface BlameHunk {
  startLine: number;
  endLine: number;
  author: BlameAuthor | null;
  commit: BlameCommit | null;
}

interface FileBlameBlob {
  path: string | null;
  blame: BlameHunk[] | null;
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

const HEADER_SEPARATOR = '------------------------------------';

function formatAuthor(hunk: BlameHunk): string {
  const displayName = hunk.author?.person?.displayName?.trim();
  const email = hunk.author?.person?.email?.trim();
  const name = displayName ?? email ?? 'Unknown author';
  const emailSuffix = email != null ? ` <${email}>` : '';
  return `${name}${emailSuffix}`;
}

function formatDate(value: string | null | undefined): string {
  if (value == null || value === '') {
    return 'Unknown date';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export async function fileBlame(
  client: SourcegraphClient,
  params: FileBlameParams,
): Promise<string> {
  const { repo, path, rev, startLine, endLine } = params;

  const variables: {
    repo: string;
    path: string;
    rev: string;
    startLine?: number;
    endLine?: number;
  } = {
    repo,
    path,
    rev: rev ?? 'HEAD',
  };

  if (typeof startLine === 'number') {
    variables.startLine = startLine;
  }
  if (typeof endLine === 'number') {
    variables.endLine = endLine;
  }

  try {
    const response = await client.query<FileBlameResponse>(FILE_BLAME_QUERY, variables);

    if (!response.repository) {
      return `Repository ${repo} not found.`;
    }

    const { commit } = response.repository;
    const revisionLabel = rev ?? 'HEAD';

    if (!commit) {
      return `Revision ${revisionLabel} not found in ${repo}.`;
    }

    const { blob } = commit;

    if (!blob) {
      return `File ${path} not found at ${revisionLabel} in ${repo}.`;
    }

    const { blame } = blob;
    const metadataLines: string[] = [
      `Repository: ${response.repository.name}`,
      `Repository URL: ${response.repository.url}`,
      `Path: ${blob.path ?? path}`,
      `Revision Requested: ${revisionLabel}`,
      `Revision OID: ${commit.oid}`,
    ];

    if (!Array.isArray(blame) || blame.length === 0) {
      metadataLines.push('', 'No blame information available for the requested range.');
      return metadataLines.join('\n');
    }

    metadataLines.push('', 'Line Range | Commit | Author | Date', HEADER_SEPARATOR);

    for (const hunk of blame) {
      const commitInfo = hunk.commit;
      const commitLabel = commitInfo?.abbreviatedOID ?? commitInfo?.oid ?? 'unknown';
      const subject = commitInfo?.subject?.trim();
      const author = formatAuthor(hunk);
      const timestamp = formatDate(hunk.author?.date);
      metadataLines.push(
        `${String(hunk.startLine)}-${String(hunk.endLine)} | ${commitLabel} | ${author} | ${timestamp}`,
      );
      if (subject != null && subject.length > 0) {
        metadataLines.push(`  ${subject}`);
      }
      if (commitInfo?.url != null) {
        metadataLines.push(`  ${commitInfo.url}`);
      }
    }

    return metadataLines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error retrieving blame information: ${message}`;
  }
}
