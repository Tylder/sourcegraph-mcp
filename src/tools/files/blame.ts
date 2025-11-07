/**
 * File blame tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { FILE_BLAME_QUERY } from '../../graphql/queries/files/blame.js';

interface BlameHunk {
  startLine: number;
  endLine: number;
  commit: {
    oid: string;
    abbreviatedOID: string;
    url: string;
    subject: string;
    author: {
      person: {
        displayName?: string | null;
        name?: string | null;
        email?: string | null;
      } | null;
      date: string;
    };
  };
}

interface FileBlameResponse {
  repository: {
    name: string;
    url: string;
    commit: {
      oid: string;
      url: string;
      file: {
        path: string;
        url: string;
        blame: BlameHunk[] | null;
      } | null;
    } | null;
  } | null;
}

export interface FileBlameParams {
  repo: string;
  path: string;
  rev?: string;
}

function formatAuthorName(hunk: BlameHunk): string {
  const person = hunk.commit.author.person;

  if (!person) {
    return 'Unknown author';
  }

  return person.displayName ?? person.name ?? person.email ?? 'Unknown author';
}

function formatAuthorEmail(hunk: BlameHunk): string {
  const email = hunk.commit.author.person?.email;
  return email ? ` <${email}>` : '';
}

export async function fileBlame(
  client: SourcegraphClient,
  params: FileBlameParams
): Promise<string> {
  const { repo, path, rev } = params;

  try {
    const response = await client.query<FileBlameResponse>(FILE_BLAME_QUERY, {
      repo,
      path,
      rev: rev ?? null,
    });

    const repository = response.repository;

    if (!repository) {
      return `Repository not found: ${repo}`;
    }

    const commit = repository.commit;
    if (!commit) {
      const revision = rev ?? 'default branch';
      return `Commit not found for revision ${revision}`;
    }

    const file = commit.file;
    if (!file) {
      return `File not found: ${path}`;
    }

    const blame = file.blame;
    if (!blame || blame.length === 0) {
      return `No blame information available for ${path}`;
    }

    let output = `Repository: ${repository.name}\n`;
    output += `File: ${file.path}\n`;
    output += `Revision: ${rev ?? 'default branch'}\n`;
    output += `URL: ${file.url}\n\n`;

    blame.forEach((hunk, index) => {
      const authorName = formatAuthorName(hunk);
      const authorEmail = formatAuthorEmail(hunk);
      const date = new Date(hunk.commit.author.date).toISOString();

      output += `Hunk ${(index + 1).toString()}: Lines ${hunk.startLine.toString()}-${hunk.endLine.toString()}\n`;
      output += `  Commit: ${hunk.commit.abbreviatedOID} (${hunk.commit.oid})\n`;
      output += `  Subject: ${hunk.commit.subject}\n`;
      output += `  Author: ${authorName}${authorEmail}\n`;
      output += `  Date: ${date}\n`;
      output += `  URL: ${hunk.commit.url}\n\n`;
    });

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error retrieving file blame: ${message}`;
  }
}
