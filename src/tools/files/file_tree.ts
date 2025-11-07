/**
 * Structured file tree retrieval
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { FILE_TREE_QUERY } from '../../graphql/queries/file-tree.js';

interface FileTreeEntryResponse {
  name: string;
  path: string;
  url: string;
  isDirectory: boolean;
  isSingleChild: boolean;
  submodule?: { url: string } | null;
}

interface FileTreeResponse {
  repository: {
    name: string;
    commit: {
      tree: {
        url: string;
        entries?: FileTreeEntryResponse[] | null;
      } | null;
    } | null;
  } | null;
}

export interface FileTreeParams {
  repo: string;
  path?: string;
  rev?: string;
}

export type FileTreeErrorCode = 'REPOSITORY_NOT_FOUND' | 'REVISION_NOT_FOUND' | 'PATH_NOT_FOUND';

export class FileTreeError extends Error {
  public readonly code: FileTreeErrorCode;

  public constructor(code: FileTreeErrorCode, message: string) {
    super(message);
    this.name = 'FileTreeError';
    this.code = code;
  }
}

export interface FileTreeFileEntry {
  type: 'file';
  name: string;
  path: string;
  url: string;
}

export interface FileTreeSubmoduleEntry {
  type: 'submodule';
  name: string;
  path: string;
  url: string;
  submoduleUrl: string;
}

export interface FileTreeDirectoryEntry {
  type: 'directory';
  name: string;
  path: string;
  url: string;
  isSingleChild: boolean;
  directories: FileTreeDirectoryEntry[];
  files: FileTreeFileEntry[];
  submodules: FileTreeSubmoduleEntry[];
}

export interface FileTreeResult {
  repo: string;
  revision: string;
  path: string;
  url: string;
  directories: FileTreeDirectoryEntry[];
  files: FileTreeFileEntry[];
  submodules: FileTreeSubmoduleEntry[];
}

interface NormalizedPath {
  queryPath: string;
  displayPath: string;
}

function normalizePath(path: string | undefined): NormalizedPath {
  if (typeof path !== 'string' || path.length === 0) {
    return { queryPath: '', displayPath: '/' };
  }

  const trimmed = path.trim();

  if (trimmed === '' || trimmed === '/') {
    return { queryPath: '', displayPath: '/' };
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
  const normalized = withoutLeadingSlash.replace(/\/+$/u, '');

  if (normalized === '') {
    return { queryPath: '', displayPath: '/' };
  }

  return { queryPath: normalized, displayPath: normalized };
}

async function fetchTreeEntries(
  client: SourcegraphClient,
  repo: string,
  revision: string,
  path: string,
): Promise<{
  url: string;
  directories: FileTreeDirectoryEntry[];
  files: FileTreeFileEntry[];
  submodules: FileTreeSubmoduleEntry[];
}> {
  const response = await client.query<FileTreeResponse>(FILE_TREE_QUERY, {
    repo,
    path,
    rev: revision,
  });

  const { repository } = response;

  if (repository === null) {
    throw new FileTreeError('REPOSITORY_NOT_FOUND', `Repository not found: ${repo}`);
  }

  const { commit } = repository;

  if (commit === null) {
    throw new FileTreeError('REVISION_NOT_FOUND', `Revision not found: ${revision}`);
  }

  const { tree } = commit;

  if (tree === null) {
    const missingPath = path === '' ? '/' : path;
    throw new FileTreeError('PATH_NOT_FOUND', `Path not found: ${missingPath}`);
  }

  const entries = tree.entries ?? [];

  const directories: FileTreeDirectoryEntry[] = [];
  const files: FileTreeFileEntry[] = [];
  const submodules: FileTreeSubmoduleEntry[] = [];

  for (const entry of entries) {
    if (entry.submodule != null) {
      submodules.push({
        type: 'submodule',
        name: entry.name,
        path: entry.path,
        url: entry.url,
        submoduleUrl: entry.submodule.url,
      });
      continue;
    }

    if (entry.isDirectory) {
      const child = await fetchTreeEntries(client, repo, revision, entry.path);
      directories.push({
        type: 'directory',
        name: entry.name,
        path: entry.path,
        url: child.url,
        isSingleChild: entry.isSingleChild,
        directories: child.directories,
        files: child.files,
        submodules: child.submodules,
      });
      continue;
    }

    files.push({
      type: 'file',
      name: entry.name,
      path: entry.path,
      url: entry.url,
    });
  }

  return { url: tree.url, directories, files, submodules };
}

export async function getFileTree(
  client: SourcegraphClient,
  params: FileTreeParams,
): Promise<FileTreeResult> {
  const { repo } = params;
  const revision = params.rev ?? 'HEAD';
  const { queryPath, displayPath } = normalizePath(params.path);

  const tree = await fetchTreeEntries(client, repo, revision, queryPath);

  return {
    repo,
    revision,
    path: displayPath,
    url: tree.url,
    directories: tree.directories,
    files: tree.files,
    submodules: tree.submodules,
  };
}

export { normalizePath as normalizeTreePath };
