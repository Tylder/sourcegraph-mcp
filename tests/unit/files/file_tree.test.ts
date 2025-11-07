import { describe, expect, it, vi } from 'vitest';
import { getFileTree, normalizeTreePath } from '../../../src/tools/files/file_tree.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('normalizeTreePath', () => {
  it('normalizes undefined and root-like values to root path', () => {
    expect(normalizeTreePath(undefined)).toEqual({
      queryPath: '',
      displayPath: '/',
    });
    expect(normalizeTreePath('')).toEqual({ queryPath: '', displayPath: '/' });
    expect(normalizeTreePath('/')).toEqual({ queryPath: '', displayPath: '/' });
    expect(normalizeTreePath(' // ')).toEqual({ queryPath: '', displayPath: '/' });
  });

  it('trims leading and trailing slashes while preserving inner structure', () => {
    expect(normalizeTreePath('src/')).toEqual({ queryPath: 'src', displayPath: 'src' });
    expect(normalizeTreePath('/src/utils/')).toEqual({
      queryPath: 'src/utils',
      displayPath: 'src/utils',
    });
    expect(normalizeTreePath('  src/docs  ')).toEqual({
      queryPath: 'src/docs',
      displayPath: 'src/docs',
    });
  });
});

describe('getFileTree', () => {
  it('builds nested directory structures recursively', async () => {
    const queryMock = vi.fn(async (_query: string, variables: { path: string }) => {
      const path = variables.path;

      if (path === '') {
        return {
          repository: {
            name: 'github.com/test/repo',
            commit: {
              tree: {
                url: 'https://example.com/root',
                entries: [
                  {
                    name: 'src',
                    path: 'src',
                    url: 'https://example.com/tree/src',
                    isDirectory: true,
                    isSingleChild: false,
                    submodule: null,
                  },
                  {
                    name: 'README.md',
                    path: 'README.md',
                    url: 'https://example.com/blob/README.md',
                    isDirectory: false,
                    isSingleChild: false,
                    submodule: null,
                  },
                ],
              },
            },
          },
        };
      }

      if (path === 'src') {
        return {
          repository: {
            name: 'github.com/test/repo',
            commit: {
              tree: {
                url: 'https://example.com/tree/src',
                entries: [
                  {
                    name: 'utils',
                    path: 'src/utils',
                    url: 'https://example.com/tree/src/utils',
                    isDirectory: true,
                    isSingleChild: true,
                    submodule: null,
                  },
                  {
                    name: 'index.ts',
                    path: 'src/index.ts',
                    url: 'https://example.com/blob/src/index.ts',
                    isDirectory: false,
                    isSingleChild: false,
                    submodule: null,
                  },
                ],
              },
            },
          },
        };
      }

      if (path === 'src/utils') {
        return {
          repository: {
            name: 'github.com/test/repo',
            commit: {
              tree: {
                url: 'https://example.com/tree/src/utils',
                entries: [
                  {
                    name: 'helpers.ts',
                    path: 'src/utils/helpers.ts',
                    url: 'https://example.com/blob/src/utils/helpers.ts',
                    isDirectory: false,
                    isSingleChild: false,
                    submodule: null,
                  },
                ],
              },
            },
          },
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const client = { query: queryMock } as unknown as SourcegraphClient;

    const result = await getFileTree(client, { repo: 'github.com/test/repo' });

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock).toHaveBeenNthCalledWith(1, expect.any(String), {
      repo: 'github.com/test/repo',
      path: '',
      rev: 'HEAD',
    });
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.any(String), {
      repo: 'github.com/test/repo',
      path: 'src',
      rev: 'HEAD',
    });
    expect(queryMock).toHaveBeenNthCalledWith(3, expect.any(String), {
      repo: 'github.com/test/repo',
      path: 'src/utils',
      rev: 'HEAD',
    });

    expect(result.path).toBe('/');
    expect(result.directories).toHaveLength(1);
    expect(result.files).toHaveLength(1);

    const [srcDirectory] = result.directories;
    expect(srcDirectory.type).toBe('directory');
    expect(srcDirectory.name).toBe('src');
    expect(srcDirectory.isSingleChild).toBe(false);
    expect(srcDirectory.files).toHaveLength(1);
    expect(srcDirectory.files[0]).toMatchObject({
      type: 'file',
      name: 'index.ts',
      path: 'src/index.ts',
    });

    expect(srcDirectory.directories).toHaveLength(1);
    const [utilsDirectory] = srcDirectory.directories;
    expect(utilsDirectory.type).toBe('directory');
    expect(utilsDirectory.name).toBe('utils');
    expect(utilsDirectory.isSingleChild).toBe(true);
    expect(utilsDirectory.files).toHaveLength(1);
    expect(utilsDirectory.files[0]).toMatchObject({
      type: 'file',
      name: 'helpers.ts',
      path: 'src/utils/helpers.ts',
    });
  });

  it('surfaces file metadata and submodules from the tree', async () => {
    const queryMock = vi.fn(
      async (
        _query: string,
        variables: { path: string; repo: string; rev: string }
      ) => {
        expect(variables.repo).toBe('github.com/test/repo');
        expect(variables.rev).toBe('HEAD');

        return {
          repository: {
            name: 'github.com/test/repo',
            commit: {
              tree: {
                url: 'https://example.com/root',
                entries: [
                  {
                    name: 'docs',
                    path: 'docs',
                    url: 'https://example.com/tree/docs',
                    isDirectory: false,
                    isSingleChild: false,
                    submodule: { url: 'https://github.com/example/docs' },
                  },
                  {
                    name: 'package.json',
                    path: 'package.json',
                    url: 'https://example.com/blob/package.json',
                    isDirectory: false,
                    isSingleChild: false,
                    submodule: null,
                    byteSize: 123,
                  },
                ],
              },
            },
          },
        };
      }
    );

    const client = { query: queryMock } as unknown as SourcegraphClient;
    const result = await getFileTree(client, { repo: 'github.com/test/repo', path: '/' });

    expect(result.submodules).toEqual([
      {
        type: 'submodule',
        name: 'docs',
        path: 'docs',
        url: 'https://example.com/tree/docs',
        submoduleUrl: 'https://github.com/example/docs',
      },
    ]);
    expect(result.files).toEqual([
      {
        type: 'file',
        name: 'package.json',
        path: 'package.json',
        url: 'https://example.com/blob/package.json',
        byteSize: 123,
      },
    ]);
    expect(result.directories).toHaveLength(0);
  });

  it('handles directories with no entries', async () => {
    const queryMock = vi.fn(async (_query: string, variables: { path: string; rev: string }) => {
      expect(variables.rev).toBe('feature');
      return {
        repository: {
          name: 'github.com/test/repo',
          commit: {
            tree: {
              url: 'https://example.com/tree/empty',
              entries: null,
            },
          },
        },
      };
    });

    const client = { query: queryMock } as unknown as SourcegraphClient;

    const result = await getFileTree(client, {
      repo: 'github.com/test/repo',
      path: 'empty',
      rev: 'feature',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), {
      repo: 'github.com/test/repo',
      path: 'empty',
      rev: 'feature',
    });

    expect(result.path).toBe('empty');
    expect(result.directories).toHaveLength(0);
    expect(result.files).toHaveLength(0);
    expect(result.submodules).toHaveLength(0);
    expect(result.url).toBe('https://example.com/tree/empty');
  });

  it('throws a FileTreeError when the repository is missing', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ repository: null }),
    } as unknown as SourcegraphClient;

    await expect(getFileTree(client, { repo: 'github.com/missing/repo' })).rejects.toMatchObject({
      code: 'REPOSITORY_NOT_FOUND',
      message: 'Repository not found: github.com/missing/repo',
    });
  });

  it('throws a FileTreeError when the revision cannot be resolved', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        repository: { name: 'github.com/test/repo', commit: null },
      }),
    } as unknown as SourcegraphClient;

    await expect(getFileTree(client, { repo: 'github.com/test/repo', rev: 'bad-commit' })).rejects.toMatchObject({
      code: 'REVISION_NOT_FOUND',
      message: 'Revision not found: bad-commit',
    });
  });

  it('throws a FileTreeError when the requested path does not exist', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          commit: { tree: null },
        },
      }),
    } as unknown as SourcegraphClient;

    await expect(getFileTree(client, { repo: 'github.com/test/repo', path: 'missing' })).rejects.toMatchObject({
      code: 'PATH_NOT_FOUND',
      message: 'Path not found: missing',
    });
  });

  it('labels the root path clearly when the path is absent in the API response', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          commit: { tree: null },
        },
      }),
    } as unknown as SourcegraphClient;

    await expect(getFileTree(client, { repo: 'github.com/test/repo' })).rejects.toMatchObject({
      code: 'PATH_NOT_FOUND',
      message: 'Path not found: /',
    });
  });
});
