import { describe, it, expect, vi } from 'vitest';
import {
  searchSymbols,
  __testHooks,
  type SearchSymbolsParams,
} from '../../../src/tools/search/search_symbols.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('searchSymbols', () => {
  it('builds the search query with type filters, limit, and cursor', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 0,
          limitHit: false,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await searchSymbols(mockClient, {
      query: 'repo:github.com/sourcegraph/sourcegraph authenticate',
      types: ['Function', ' Class '],
      limit: 5,
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [calledQuery, variables] = queryMock.mock.calls[0] as [string, Record<string, unknown>];

    expect(calledQuery).toContain('query SymbolSearch');
    expect(variables).toEqual({
      query:
        'type:symbol repo:github.com/sourcegraph/sourcegraph authenticate (kind:FUNCTION OR kind:CLASS) count:5',
      cursor: null,
    });
  });

  it('formats symbol results and pagination information', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'SymbolSearchResult',
              symbol: {
                name: 'Authenticate',
                kind: 'FUNCTION',
                language: 'TypeScript',
                containerName: 'AuthService',
                url: 'https://sourcegraph.com/github.com/example/repo/-/blob/src/auth.ts#L11:5',
                location: {
                  resource: {
                    repository: {
                      name: 'github.com/example/repo',
                      url: 'https://sourcegraph.com/github.com/example/repo',
                    },
                    path: 'src/auth.ts',
                  },
                  range: {
                    start: {
                      line: 10,
                      character: 4,
                    },
                  },
                },
              },
            },
          ],
          matchCount: 1,
          limitHit: true,
          pageInfo: { hasNextPage: true, endCursor: 'cursor123' },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, {
      query: 'Authenticate',
      types: ['Function'],
      limit: 15,
      cursor: 'prev-cursor',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), {
      query: 'type:symbol Authenticate kind:FUNCTION count:15',
      cursor: 'prev-cursor',
    });

    expect(output).toContain('Symbol Search Results');
    expect(output).toContain('Query: Authenticate');
    expect(output).toContain('Type Filters: FUNCTION');
    expect(output).toContain('Requested: 15');
    expect(output).toContain('Match Count: 1');
    expect(output).toContain('Has Next Page: yes');
    expect(output).toContain('Next Page Cursor: cursor123');
    expect(output).toContain('Note: Result limit hit, showing first 15 symbols');
    expect(output).toContain('Result 1:');
    expect(output).toContain('Name: Authenticate');
    expect(output).toContain('Kind: FUNCTION');
    expect(output).toContain('Language: TypeScript');
    expect(output).toContain('Container: AuthService');
    expect(output).toContain('Repository: github.com/example/repo');
    expect(output).toContain('File: src/auth.ts');
    expect(output).toContain(
      'URL: https://sourcegraph.com/github.com/example/repo/-/blob/src/auth.ts#L11:5',
    );
    expect(output).toContain('Line: 11');
    expect(output).toContain('Column: 5');
  });

  it('returns message when no symbol results are found', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [{ __typename: 'FileMatch' }, { __typename: 'CommitSearchResult' }],
          matchCount: 0,
          limitHit: false,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, { query: 'missing symbol' });

    expect(output).toContain('No symbols found');
  });

  it('returns an error message when the query fails', async () => {
    const queryMock = vi.fn().mockRejectedValue('network issue');
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, { query: 'oops' });

    expect(output).toBe('Error searching symbols: network issue');
  });

  it('ignores unsupported type filters while reporting them', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 0,
          limitHit: false,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, {
      query: 'foo',
      types: ['Function', 123 as unknown as string, 'unknown', ''],
    });

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), {
      query: 'type:symbol foo kind:FUNCTION count:10',
      cursor: null,
    });

    expect(output).toContain('Type Filters: FUNCTION');
    expect(output).toContain('Ignored Type Filters: unknown');
  });

  it('omits line and column when location is incomplete', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'SymbolSearchResult',
              symbol: {
                name: 'NoCoords',
                kind: 'VARIABLE',
                language: 'Go',
                url: 'https://example.com',
                location: {
                  resource: {
                    repository: null,
                    path: null,
                  },
                  range: {
                    start: {
                      line: null,
                      character: undefined,
                    },
                  },
                },
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, { query: 'NoCoords' });

    expect(output).toContain('Result 1:');
    expect(output).not.toContain('Repository:');
    expect(output).not.toContain('File:');
    expect(output).not.toContain('Line:');
    expect(output).not.toContain('Column:');
  });

  it('handles results without pagination information', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'SymbolSearchResult',
              symbol: {
                name: 'Foo',
                kind: 'CLASS',
                language: 'Java',
                url: 'https://example.com/foo',
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
          pageInfo: null,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, { query: 'Foo' });

    expect(output).not.toContain('Has Next Page:');
    expect(output).not.toContain('Next Page Cursor:');
  });

  it('returns error message for thrown Error instances', async () => {
    const queryMock = vi.fn().mockRejectedValue(new Error('boom goes search'));
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchSymbols(mockClient, { query: 'anything' });

    expect(output).toBe('Error searching symbols: boom goes search');
  });

  it('falls back to known kinds when alias is absent', () => {
    const { normalizeTypeFilters, aliases } = __testHooks;
    const originalStruct = aliases.struct;
    // Temporarily remove alias to force fallback path

    delete aliases.struct;

    try {
      const result = normalizeTypeFilters(['STRUCT']);
      expect(result.accepted).toContain('STRUCT');
    } finally {
      aliases.struct = originalStruct;
    }
  });

  it('quotes type filters containing whitespace', () => {
    const { buildSearchQuery } = __testHooks;
    const params = { query: 'foo', limit: 5 } as SearchSymbolsParams;
    const { query } = buildSearchQuery(params, ['WITH SPACE']);

    expect(query).toContain('kind:"WITH SPACE"');
  });

  it('omits empty user query segments', () => {
    const { buildSearchQuery } = __testHooks;
    const params = { query: '   ', limit: 7 } as SearchSymbolsParams;
    const { query, requested } = buildSearchQuery(params, []);

    expect(query).toBe('type:symbol count:7');
    expect(requested).toBe(7);
  });
});
