import { describe, it, expect, vi } from 'vitest';
import { searchSymbols } from '../../../../src/tools/search/symbols.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('searchSymbols', () => {
  it('should search for symbols', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
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
                    lineNumber: 10,
                    offsetAndLengths: [[0, 8]],
                    preview: 'function authenticate()',
                  },
                ],
              },
            ],
            matchCount: 1,
            limitHit: false,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'authenticate' });

    expect(result).toContain('Search Query: authenticate');
    expect(result).toContain('Result Count: 1');
    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('Symbols:');
    expect(result).toContain('Line 10: function authenticate()');
  });

  it('should filter by symbol types', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [],
            matchCount: 0,
            limitHit: false,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    await searchSymbols(mockClient, { query: 'test', types: ['function', 'class'] });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.stringContaining('type:symbol'),
      }),
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.stringContaining('symbol:function OR symbol:class'),
      }),
    );
  });

  it('should handle no results', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [],
            matchCount: 0,
            limitHit: false,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'nonexistent' });

    expect(result).toContain('No symbols found');
  });

  it('should include type filter in output', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [],
            matchCount: 0,
            limitHit: false,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, {
      query: 'test',
      types: ['function'],
    });

    expect(result).toContain('Symbol Types: function');
  });

  it('should handle errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('API error')),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'test' });

    expect(result).toContain('Error searching symbols: API error');
  });

  it('should apply limit to query', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [],
            matchCount: 0,
            limitHit: false,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    await searchSymbols(mockClient, { query: 'test', limit: 5 });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.stringContaining('count:5'),
      }),
    );
  });

  it('should warn about limit hit', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [],
            matchCount: 50,
            limitHit: true,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'common', limit: 10 });

    expect(result).toContain('Result limit hit');
  });

  it('should handle results without line matches', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            results: [
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
            matchCount: 1,
            limitHit: false,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'test' });

    expect(result).toContain('File: test.ts');
    expect(result).not.toContain('Symbols:');
  });

  it('should handle non-Error exceptions', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('string error'),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'test' });

    expect(result).toContain('Error searching symbols: string error');
  });

  it('should skip non-FileMatch results', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
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
      }),
    } as unknown as SourcegraphClient;

    const result = await searchSymbols(mockClient, { query: 'test' });

    expect(result).toContain('Result Count: 2');
    expect(result).toContain('Result 2:');
    expect(result).not.toContain('Result 1:');
  });
});
