/**
 * Tests for the fileGet MCP tool implementation.
 *
 * This test suite verifies the fileGet tool's ability to:
 * - Retrieve and format file content from GraphQL responses
 * - Handle various file types (text, binary, empty, large files)
 * - Process different revision specifications (HEAD, branch names, commit hashes)
 * - Handle error conditions (missing files, network errors, permission issues)
 * - Validate response formatting and metadata display
 *
 * The tests ensure proper handling of edge cases like binary files, syntax highlighting,
 * and various GraphQL response structures.
 */

import { describe, it, expect, vi } from 'vitest';
import { fileGet } from '../../../../src/tools/files/file_get.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';
import { createMockClientWithError } from '../../../test-utils.js';

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

    // Validate exact output structure
    const lines = result.split('\n');
    expect(lines[0]).toBe('Repository: github.com/test/repo');
    expect(lines[1]).toBe('Repository URL: /github.com/test/repo');
    expect(lines[2]).toBe('Path: src/index.ts');
    expect(lines[3]).toBe('Revision Requested: main');
    expect(lines[4]).toBe('Revision OID: abcdef');
    expect(lines[5]).toBe('Size: 24 bytes');
    expect(lines[6]).toBe('');
    expect(lines[7]).toBe('console.log("hello");');
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

  describe('Error Handling', () => {
    it.each([
      {
        error: new Error('GraphQL error'),
        expectedMessage: 'Error retrieving file: GraphQL error',
      },
      { error: 'GraphQL error', expectedMessage: 'Error retrieving file: GraphQL error' },
      {
        error: new Error('Connection timeout'),
        expectedMessage: 'Error retrieving file: Connection timeout',
      },
      {
        error: new Error('Permission denied'),
        expectedMessage: 'Error retrieving file: Permission denied',
      },
    ])('should handle $error gracefully', async ({ error, expectedMessage }) => {
      const mockClient = createMockClientWithError(error);
      const result = await fileGet(mockClient, {
        repo: 'github.com/test/repo',
        path: 'src/index.ts',
      });
      expect(result).toBe(expectedMessage);
    });
  });

  it('should handle completely malformed GraphQL responses', async () => {
    const query = vi.fn().mockResolvedValue(null);
    const mockClient = { query } as unknown as SourcegraphClient;

    const result = await fileGet(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle files with special characters in names', async () => {
    const query = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/test/repo',
        url: '/github.com/test/repo',
        commit: {
          oid: 'abcdef',
          blob: {
            path: 'file with spaces & special-chars_(test).md',
            content: 'Content with **markdown**',
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
      path: 'file with spaces & special-chars_(test).md',
    });

    expect(result).toContain('Path: file with spaces & special-chars_(test).md');
    expect(result).toContain('Content with **markdown**');
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
