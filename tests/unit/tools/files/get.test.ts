import { describe, it, expect, vi } from 'vitest';
import { fileGet } from '../../../../src/tools/files/file_get.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('fileGet', () => {
  it('should return file content with metadata', async () => {
    const query = vi.fn().mockResolvedValue({
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
            },
          },
        },
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

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
    expect(result).toContain('console.log("hello");');
  });

  it('should omit content for binary files', async () => {
    const query = vi.fn().mockResolvedValue({
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
            },
          },
        },
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'bin/file',
    });

    expect(result).toContain('Revision Requested: HEAD');
    expect(result).toContain('Warning: Binary file content is not displayed.');
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: 'bin/file',
        rev: 'HEAD',
      }),
    );
  });

  it('should handle missing repository', async () => {
    const query = vi.fn().mockResolvedValue({
      repository: null,
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Repository github.com/test/repo not found.');
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: 'src/index.ts',
        rev: 'HEAD',
      }),
    );
  });

  it('should handle missing commit', async () => {
    const query = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/test/repo',
        url: '/github.com/test/repo',
        commit: null,
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toBe('Revision main not found in github.com/test/repo.');
  });

  it('should handle missing blob', async () => {
    const query = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/test/repo',
        url: '/github.com/test/repo',
        commit: {
          oid: 'abcdef',
          blob: null,
        },
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toBe('File src/index.ts not found at main in github.com/test/repo.');
  });

  it('should handle missing content', async () => {
    const query = vi.fn().mockResolvedValue({
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
            },
          },
        },
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'README.md',
    });

    expect(result).toContain('No content available for this file.');
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: 'README.md',
        rev: 'HEAD',
      }),
    );
  });

  it('should fall back to requested path when blob path is missing', async () => {
    const query = vi.fn().mockResolvedValue({
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
            },
          },
        },
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'docs/README.md',
    });

    expect(result).toContain('Path: docs/README.md');
  });

  it('should note highlighting aborts', async () => {
    const query = vi.fn().mockResolvedValue({
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
            },
          },
        },
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toContain('Syntax highlighting was aborted');
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: 'src/index.ts',
        rev: 'HEAD',
      }),
    );
  });

  it('should handle errors gracefully', async () => {
    const query = vi.fn().mockRejectedValue(new Error('GraphQL error'));
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Error retrieving file: GraphQL error');
  });

  it('should handle non-Error rejections gracefully', async () => {
    const query = vi.fn().mockRejectedValue('GraphQL error');
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Error retrieving file: GraphQL error');
  });

  it('should pass variables to the query', async () => {
    const query = vi.fn().mockResolvedValue({
      repository: null,
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: 'github.com/test/repo',
        path: 'src/index.ts',
        rev: 'main',
      }),
    );
  });
});
