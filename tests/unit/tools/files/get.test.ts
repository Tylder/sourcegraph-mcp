import { describe, it, expect, vi } from 'vitest';
import { fileGet } from '../../../../src/tools/files/get.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('fileGet', () => {
  it('should return file content with metadata', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'src/index.ts',
              content: 'console.log("hello");\n',
              byteSize: 24,
              isBinary: false,
              highlight: {
                aborted: false,
                language: 'TypeScript',
              },
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('Repository URL: /github.com/test/repo');
    expect(result).toContain('Path: src/index.ts');
    expect(result).toContain('Revision Requested: main');
    expect(result).toContain('Revision OID: abcdef');
    expect(result).toContain('Size: 24 bytes');
    expect(result).toContain('Language: TypeScript');
    expect(result).toContain('console.log("hello");');
  });

  it('should omit content for binary files', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'bin/file',
              content: null,
              byteSize: 1024,
              isBinary: true,
              highlight: {
                aborted: false,
                language: null,
              },
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'bin/file',
    });

    expect(result).toContain('Revision Requested: HEAD');
    expect(result).toContain('Language: unknown');
    expect(result).toContain('Warning: Binary file content is not displayed.');
  });

  it('should handle missing repository', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: null,
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Repository github.com/test/repo not found.');
  });

  it('should handle missing commit', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toBe('Revision main not found in github.com/test/repo.');
  });

  it('should handle missing blob', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: null,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toBe(
      'File src/index.ts not found at main in github.com/test/repo.'
    );
  });

  it('should handle missing content', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'README.md',
              content: null,
              byteSize: 10,
              isBinary: false,
              highlight: {
                aborted: false,
                language: 'Markdown',
              },
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'README.md',
    });

    expect(result).toContain('No content available for this file.');
  });

  it('should fall back to requested path when blob path is missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: null,
              content: 'data',
              byteSize: 4,
              isBinary: false,
              highlight: {
                aborted: false,
                language: 'Plain Text',
              },
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'docs/README.md',
    });

    expect(result).toContain('Path: docs/README.md');
    expect(result).toContain('Language: Plain Text');
  });

  it('should note highlighting aborts', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'src/index.ts',
              content: 'code',
              byteSize: 4,
              isBinary: false,
              highlight: {
                aborted: true,
                language: 'TypeScript',
              },
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toContain('Syntax highlighting was aborted');
  });

  it('should handle errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL error')),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Error retrieving file: GraphQL error');
  });

  it('should handle non-Error rejections gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('GraphQL error'),
    } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Error retrieving file: GraphQL error');
  });

  it('should pass variables to the query', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: null,
      }),
    } as unknown as SourcegraphClient;

    await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: 'src/index.ts',
        rev: 'main',
      })
    );
  });
});
