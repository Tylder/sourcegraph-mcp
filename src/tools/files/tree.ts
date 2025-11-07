/**
 * File tree tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { FILE_TREE_QUERY } from '../../graphql/queries/file-tree.js';

interface FileTreeResponse {
  repository: {
    name: string;
    url: string;
    commit: {
      oid: string;
      tree: {
        url: string;
        entries?:
          | {
              name: string;
              path: string;
              url: string;
              isDirectory: boolean;
              isSingleChild: boolean;
              byteSize?: number | null;
              submodule?: {
                url: string;
              } | null;
            }[]
          | null;
      } | null;
    } | null;
  } | null;
}

export interface FileTreeParams {
  repo: string;
  path?: string;
  rev?: string;
}

function normalizeTreePath(path: string | undefined): { queryPath: string; displayPath: string } {
  if (!path) {
    return { queryPath: '', displayPath: '/' };
  }

  const trimmed = path.trim();

  if (trimmed === '' || trimmed === '/') {
    return { queryPath: '', displayPath: '/' };
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/u, '');
  const normalized = withoutLeadingSlash.replace(/\/+$/u, '');

  return {
    queryPath: normalized,
    displayPath: normalized === '' ? '/' : normalized,
  };
}

export async function fileTree(client: SourcegraphClient, params: FileTreeParams): Promise<string> {
  const { repo, rev } = params;
  const { queryPath, displayPath } = normalizeTreePath(params.path);

  try {
    const response = await client.query<FileTreeResponse>(FILE_TREE_QUERY, {
      repo,
      path: queryPath,
      rev: rev ?? null,
    });

    if (!response.repository) {
      return `Repository not found: ${repo}`;
    }

    if (!response.repository.commit) {
      const revision = rev ?? 'HEAD';
      return `Revision not found: ${revision}`;
    }

    const tree = response.repository.commit.tree;
    if (!tree) {
      return `Path not found: ${displayPath}`;
    }

    const entries = tree.entries ?? [];

    let output = `Repository: ${response.repository.name}\n`;
    output += `Revision: ${rev ?? 'HEAD'}\n`;
    output += `Path: ${displayPath}\n\n`;

    if (entries.length === 0) {
      output += 'No entries found in this directory.\n';
      return output;
    }

    output += 'Entries:\n';

    entries.forEach((entry, index) => {
      const entryNumber = (index + 1).toString();
      let typeLabel = 'File';

      if (entry.submodule) {
        typeLabel = 'Submodule';
      } else if (entry.isDirectory) {
        typeLabel = 'Directory';
      }

      output += `${entryNumber}. [${typeLabel}] ${entry.name} (${entry.path})\n`;
      output += `   URL: ${entry.url}\n`;

      if (entry.isSingleChild) {
        output += '   Note: Single child directory\n';
      }

      if (entry.submodule) {
        output += `   Submodule URL: ${entry.submodule.url}\n`;
      }

      output += '\n';
    });

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching file tree: ${message}`;
  }
}
