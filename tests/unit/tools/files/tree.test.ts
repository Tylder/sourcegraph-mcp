import { describe, it, expect, vi } from 'vitest';
import { fileTree } from '../../../../src/tools/files/tree.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('fileTree', () => {
  it('should format tree entries correctly', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/src',
              entries: [
                {
                  name: 'src',
                  path: 'src',
                  url: '/tree/src',
                  isDirectory: true,
                  isSingleChild: false,
                },
                {
                  name: 'README.md',
                  path: 'README.md',
                  url: '/blob/README.md',
                  isDirectory: false,
                  isSingleChild: false,
                  byteSize: 1200,
                },
              ],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src',
      rev: 'main',
    });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('Revision: main');
    expect(result).toContain('Path: src');
    expect(result).toContain('[Directory] src');
    expect(result).toContain('[File] README.md');
    expect(result).toContain('Size: 1200 bytes');
  });

  it('should default to HEAD revision and root path', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/',
              entries: [],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: '',
        rev: null,
      })
    );
    expect(result).toContain('Revision: HEAD');
    expect(result).toContain('Path: /');
    expect(result).toContain('No entries found');
  });

  it('should treat slash path as repository root', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/',
              entries: [],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: '/',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        path: '',
      })
    );
    expect(result).toContain('Path: /');
  });

  it('should treat whitespace path as repository root', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/',
              entries: [],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: '   ',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        path: '',
      })
    );
    expect(result).toContain('Path: /');
  });

  it('should collapse redundant slashes to repository root', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/',
              entries: [],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: '///',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        path: '',
      })
    );
    expect(result).toContain('Path: /');
  });

  it('should normalize leading and trailing slashes in path', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/docs',
              entries: [],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: '/docs/',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        path: 'docs',
      })
    );
    expect(result).toContain('Path: docs');
  });

  it('should handle tree entries being null', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/github.com/test/repo/-/tree/src',
              entries: null,
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src',
    });

    expect(result).toContain('No entries found in this directory.');
  });

  it('should handle repository not found', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: null,
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/missing',
    });

    expect(result).toBe('Repository not found: github.com/test/missing');
  });

  it('should handle missing revision', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      rev: 'feature',
    });

    expect(result).toBe('Revision not found: feature');
  });

  it('should handle missing revision with default HEAD label', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
    });

    expect(result).toBe('Revision not found: HEAD');
  });

  it('should handle missing tree', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: null,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: 'unknown',
    });

    expect(result).toBe('Path not found: unknown');
  });

  it('should note single child directories', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/tree/src',
              entries: [
                {
                  name: 'src',
                  path: 'src',
                  url: '/tree/src',
                  isDirectory: true,
                  isSingleChild: true,
                },
              ],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src',
    });

    expect(result).toContain('Note: Single child directory');
  });

  it('should include submodule information', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: '123',
            tree: {
              url: '/tree',
              entries: [
                {
                  name: 'submodule',
                  path: 'submodule',
                  url: '/tree/submodule',
                  isDirectory: false,
                  isSingleChild: false,
                  submodule: {
                    url: 'https://github.com/example/submodule',
                  },
                },
              ],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
    });

    expect(result).toContain('[Submodule] submodule');
    expect(result).toContain('Submodule URL: https://github.com/example/submodule');
  });

  it('should handle query errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL error')),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
    });

    expect(result).toBe('Error fetching file tree: GraphQL error');
  });

  it('should handle non-Error exceptions gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('string error'),
    } as unknown as SourcegraphClient;

    const result = await fileTree(mockClient, {
      repo: 'github.com/test/repo',
    });

    expect(result).toBe('Error fetching file tree: string error');
  });
});
