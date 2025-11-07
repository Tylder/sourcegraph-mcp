import { describe, it, expect, vi } from 'vitest';
import { searchCode } from '../../../../src/tools/search/code.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('searchCode', () => {
  it('should format search results correctly', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'FileMatch',
              file: {
                path: 'src/auth.ts',
                url: '/repo/-/blob/src/auth.ts',
              },
              repository: {
                name: 'github.com/test/repo',
                url: '/github.com/test/repo',
              },
              lineMatches: [
                {
                  lineNumber: 42,
                  offsetAndLengths: [[0, 10]],
                  preview: 'function authenticate()',
                },
              ],
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'authenticate' });

    expect(result).toContain('Search Query: authenticate');
    expect(result).toContain('Result Count: 1');
    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('File: src/auth.ts');
    expect(result).toContain('Line 42: function authenticate()');
  });

  it('should apply limit to query', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 0,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await searchCode(mockClient, { query: 'test', limit: 5 });

    expect(queryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: 'test count:5',
      }),
    );
  });

  it('should handle no results', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 0,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'nonexistent' });

    expect(result).toContain('No results found');
  });

  it('should warn about limit hit', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 100,
          limitHit: true,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'common', limit: 10 });

    expect(result).toContain('Result limit hit');
  });

  it('should warn about cloning repositories', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 0,
          limitHit: false,
          cloning: [{ name: 'repo1' }, { name: 'repo2' }],
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('2 repositories still cloning');
  });

  it('should warn about timed out repositories', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [],
            matchCount: 0,
            limitHit: false,
            timedout: [{ name: 'slow-repo' }],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('1 repositories timed out');
  });

  it('should handle query errors gracefully', async () => {
    const queryMock = vi.fn().mockRejectedValue(new Error('GraphQL error'));
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('Error searching code: GraphQL error');
  });

  it('should handle results without line matches', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'FileMatch',
              file: {
                path: 'README.md',
                url: '/repo/-/blob/README.md',
              },
              repository: {
                name: 'github.com/test/repo',
                url: '/github.com/test/repo',
              },
              lineMatches: [],
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('File: README.md');
    expect(result).not.toContain('Matches:');
  });

  it('should handle non-Error exceptions in query', async () => {
    const queryMock = vi.fn().mockRejectedValue('string error');
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('Error searching code: string error');
  });

  it('should handle results without lineMatches field', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'FileMatch',
              file: {
                path: 'package.json',
                url: '/repo/-/blob/package.json',
              },
              repository: {
                name: 'github.com/test/repo',
                url: '/github.com/test/repo',
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('File: package.json');
    expect(result).not.toContain('Matches:');
  });

  it('should skip non-FileMatch results', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitMatch',
            },
            {
              __typename: 'FileMatch',
              file: {
                path: 'test.ts',
                url: '/repo/-/blob/test.ts',
              },
              repository: {
                name: 'github.com/test/repo',
                url: '/github.com/test/repo',
              },
            },
          ],
          matchCount: 2,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'test' });

    expect(result).toContain('Result Count: 2');
    // First result is skipped (CommitMatch), so FileMatch becomes Result 2
    expect(result).toContain('Result 2:');
    expect(result).toContain('File: test.ts');
    expect(result).not.toContain('Result 1:');
  });
});
