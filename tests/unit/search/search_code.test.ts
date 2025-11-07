import { describe, it, expect, vi } from 'vitest';
import { searchCode } from '../../../src/tools/search/search_code.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('searchCode', () => {
  it('returns structured search results for multiple match types', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            matchCount: 3,
            approximateResultCount: '3',
            limitHit: false,
            dynamicFilters: [
              {
                value: 'lang:typescript',
                label: 'Language: TypeScript',
                count: 2,
                kind: 'LANGUAGE',
              },
            ],
            results: [
              {
                __typename: 'FileMatch',
                repository: {
                  name: 'github.com/sourcegraph/example',
                  url: 'https://example.com/repo',
                },
                file: {
                  path: 'src/index.ts',
                  url: 'https://example.com/repo/-/blob/src/index.ts',
                },
                lineMatches: [
                  {
                    lineNumber: 42,
                    offsetAndLengths: [[1, 6]],
                    preview: 'function example() { return true; }',
                  },
                ],
              },
              {
                __typename: 'Repository',
                name: 'github.com/sourcegraph/another',
                url: 'https://example.com/another',
                description: 'Second repository',
              },
              {
                __typename: 'CommitSearchResult',
                commit: {
                  repository: {
                    name: 'github.com/sourcegraph/example',
                    url: 'https://example.com/repo',
                  },
                  oid: '1234567890abcdef',
                  abbreviatedOID: '1234567',
                  url: 'https://example.com/commit/1234567',
                  subject: 'Fix bug',
                },
                messagePreview: { value: 'Fix bug in example()' },
              },
              { __typename: 'DiffSearchResult' },
            ],
            cloning: [{ name: 'github.com/sourcegraph/slow-repo' }],
            timedout: [{ name: 'github.com/sourcegraph/timeout-repo' }],
            missing: [
              {
                name: 'github.com/sourcegraph/missing-repo',
                reason: 'CLONING',
                url: 'https://example.com/missing',
              },
            ],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, {
      query: 'repo:sourcegraph/example example',
      limit: 5,
      timeout: 5000,
      version: 'V3',
    });

    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
      query: expect.stringContaining('count:5'),
      version: 'V3',
    });
    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
      query: expect.stringContaining('timeout:5s'),
      version: 'V3',
    });

    expect(result.query).toBe('repo:sourcegraph/example example');
    expect(result.executedQuery).toContain('count:5');
    expect(result.executedQuery).toContain('timeout:5s');
    expect(result.limit).toBe(5);
    expect(result.version).toBe('V3');
    expect(result.matchCount).toBe(3);
    expect(result.approximateResultCount).toBe('3');
    expect(result.limitHit).toBe(false);

    expect(result.dynamicFilters).toEqual([
      {
        value: 'lang:typescript',
        label: 'Language: TypeScript',
        count: 2,
        kind: 'LANGUAGE',
      },
    ]);

    expect(result.fileMatches).toEqual([
      {
        repository: 'github.com/sourcegraph/example',
        repositoryUrl: 'https://example.com/repo',
        path: 'src/index.ts',
        url: 'https://example.com/repo/-/blob/src/index.ts',
        lineMatches: [
          {
            lineNumber: 42,
            offsets: [[1, 6]],
            preview: 'function example() { return true; }',
          },
        ],
      },
    ]);

    expect(result.repositoryMatches).toEqual([
      {
        name: 'github.com/sourcegraph/another',
        url: 'https://example.com/another',
        description: 'Second repository',
      },
    ]);

    expect(result.commitMatches).toEqual([
      {
        repository: 'github.com/sourcegraph/example',
        repositoryUrl: 'https://example.com/repo',
        oid: '1234567890abcdef',
        abbreviatedOID: '1234567',
        url: 'https://example.com/commit/1234567',
        subject: 'Fix bug',
        messagePreview: 'Fix bug in example()',
      },
    ]);

    expect(result.status).toEqual({
      cloning: ['github.com/sourcegraph/slow-repo'],
      timedout: ['github.com/sourcegraph/timeout-repo'],
      missing: [
        {
          name: 'github.com/sourcegraph/missing-repo',
          reason: 'CLONING',
          url: 'https://example.com/missing',
        },
      ],
    });
  });

  it('normalises query and limit values before executing search', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            matchCount: 0,
            approximateResultCount: '0',
            limitHit: false,
            dynamicFilters: [],
            results: [],
            cloning: [],
            timedout: [],
            missing: [],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, {
      query: '   test   ',
      limit: 0,
    });

    expect(result.limit).toBe(10);
    expect(result.executedQuery).toContain('count:10');
    expect(result.executedQuery).not.toContain('timeout:');
    expect(result.query).toBe('test');
  });

  it('clamps invalid limit values to safe defaults', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            matchCount: 0,
            approximateResultCount: '0',
            limitHit: false,
            dynamicFilters: [],
            results: [],
            cloning: [],
            timedout: [],
            missing: [],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const nanLimit = await searchCode(mockClient, { query: 'test', limit: Number.NaN });
    expect(nanLimit.limit).toBe(10);

    const clampedLimit = await searchCode(mockClient, { query: 'test', limit: 9999 });
    expect(clampedLimit.limit).toBe(500);
  });

  it('respects existing filters and formats timeout values appropriately', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            matchCount: 0,
            approximateResultCount: '0',
            limitHit: false,
            dynamicFilters: [],
            results: [],
            cloning: [],
            timedout: [],
            missing: [],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    await searchCode(mockClient, {
      query: 'timeout:2s count:20 foo',
      limit: 50,
      timeout: 1500,
    });
    expect(mockClient.query).toHaveBeenNthCalledWith(1, expect.any(String), {
      query: 'timeout:2s count:20 foo',
      version: 'V3',
    });

    await searchCode(mockClient, { query: 'repo:example', timeout: 1500 });
    expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.any(String), {
      query: 'repo:example count:10 timeout:1500ms',
      version: 'V3',
    });

    await searchCode(mockClient, { query: 'repo:example', timeout: 0.4 });
    expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.any(String), {
      query: 'repo:example count:10',
      version: 'V3',
    });
  });

  it('omits incomplete match entries and normalises missing metadata', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            matchCount: 2,
            approximateResultCount: '2',
            limitHit: false,
            dynamicFilters: undefined,
            results: [
              {
                __typename: 'FileMatch',
                repository: null,
                file: { path: 'src/index.ts', url: 'https://example.com/blob' },
                lineMatches: [],
              },
              {
                __typename: 'FileMatch',
                repository: {
                  name: 'github.com/sourcegraph/example',
                  url: 'https://example.com/repo',
                },
                file: { path: 'src/index.ts', url: 'https://example.com/blob' },
                lineMatches: [],
              },
              {
                __typename: 'Repository',
                name: 'github.com/sourcegraph/empty',
                url: 'https://example.com/empty',
                description: null,
              },
              {
                __typename: 'CommitSearchResult',
                commit: null,
                messagePreview: { value: 'orphan preview' },
              },
            ],
            cloning: undefined,
            timedout: undefined,
            missing: undefined,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'repo:example file.ts' });

    expect(result.dynamicFilters).toEqual([]);
    expect(result.fileMatches).toEqual([
      {
        repository: 'github.com/sourcegraph/example',
        repositoryUrl: 'https://example.com/repo',
        path: 'src/index.ts',
        url: 'https://example.com/blob',
        lineMatches: [],
      },
    ]);
    expect(result.repositoryMatches).toEqual([
      {
        name: 'github.com/sourcegraph/empty',
        url: 'https://example.com/empty',
        description: undefined,
      },
    ]);
    expect(result.commitMatches).toEqual([]);
    expect(result.status).toEqual({ cloning: [], timedout: [], missing: [] });
  });

  it('normalises optional nested fields on match records', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        search: {
          results: {
            matchCount: 1,
            approximateResultCount: '1',
            limitHit: false,
            dynamicFilters: [],
            results: [
              {
                __typename: 'FileMatch',
                repository: {
                  name: 'github.com/sourcegraph/example',
                  url: 'https://example.com/repo',
                },
                file: { path: 'src/index.ts', url: 'https://example.com/blob' },
                lineMatches: [
                  {
                    lineNumber: 1,
                    offsetAndLengths: undefined,
                    preview: null,
                  },
                ],
              },
              {
                __typename: 'CommitSearchResult',
                commit: {
                  repository: null,
                  oid: 'abcdef1234567890',
                  abbreviatedOID: null,
                  url: 'https://example.com/commit',
                  subject: null,
                },
                messagePreview: { value: null },
              },
            ],
            cloning: [],
            timedout: [],
            missing: [
              {
                name: 'github.com/sourcegraph/missing',
                reason: null,
                url: null,
              },
            ],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await searchCode(mockClient, { query: 'repo:example file.ts' });

    expect(result.fileMatches).toEqual([
      {
        repository: 'github.com/sourcegraph/example',
        repositoryUrl: 'https://example.com/repo',
        path: 'src/index.ts',
        url: 'https://example.com/blob',
        lineMatches: [
          {
            lineNumber: 1,
            preview: '',
            offsets: [],
          },
        ],
      },
    ]);
    expect(result.commitMatches).toEqual([
      {
        repository: 'unknown',
        repositoryUrl: undefined,
        oid: 'abcdef1234567890',
        abbreviatedOID: undefined,
        url: 'https://example.com/commit',
        subject: undefined,
        messagePreview: undefined,
      },
    ]);
    expect(result.status.missing).toEqual([
      { name: 'github.com/sourcegraph/missing', reason: undefined, url: undefined },
    ]);
  });

  it('throws a descriptive error when the GraphQL request fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL query failed: boom')),
    } as unknown as SourcegraphClient;

    await expect(searchCode(mockClient, { query: 'test' })).rejects.toThrow(
      'Code search failed: GraphQL query failed: boom',
    );
  });

  it('wraps non-Error throwables when the GraphQL client fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('boom'),
    } as unknown as SourcegraphClient;

    await expect(searchCode(mockClient, { query: 'test' })).rejects.toThrow(
      'Code search failed: boom',
    );
  });

  it('throws when the search query is empty', async () => {
    const mockClient = { query: vi.fn() } as unknown as SourcegraphClient;

    await expect(searchCode(mockClient, { query: '   ' })).rejects.toThrow(
      'Search query must not be empty.',
    );
  });
});
