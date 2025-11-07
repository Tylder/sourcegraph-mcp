import { describe, it, expect, vi } from 'vitest';
import { searchCommits } from '../../../src/tools/search/search_commits.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';
import { COMMIT_SEARCH_QUERY } from '../../../src/graphql/queries/search.js';

describe('searchCommits', () => {
  it('formats commit results including message and diff previews', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitSearchResult',
              commit: {
                repository: {
                  name: 'github.com/sourcegraph/test',
                  url: 'https://sourcegraph.com/github.com/sourcegraph/test',
                },
                oid: '1234567890abcdef',
                abbreviatedOID: '1234567',
                url: 'https://sourcegraph.com/github.com/sourcegraph/test/-/commit/1234567',
                subject: 'feat: add new search tool',
                body: 'Extended commit body describing the change.\n',
                author: {
                  person: {
                    displayName: 'Alice Example',
                    email: 'alice@example.com',
                  },
                  date: '2024-02-20T10:30:00Z',
                },
              },
              messagePreview: {
                value: 'Update <span class="highlight">search</span> functionality',
              },
              diffPreview: {
                value:
                  'diff --git a/file.ts b/file.ts\n<span class="hl">+const change &lt;= true;</span>\n',
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCommits(mockClient, {
      query: 'repo:sourcegraph type:commit search',
    });

    expect(result).toContain('Search Query: repo:sourcegraph type:commit search');
    expect(result).toContain('Repository: github.com/sourcegraph/test');
    expect(result).toContain('Commit: 1234567');
    expect(result).toContain('Author: Alice Example');
    expect(result).toContain('Date: 2024-02-20T10:30:00Z');
    expect(result).toContain('Subject: feat: add new search tool');
    expect(result).toContain('Body:');
    expect(result).toContain('Extended commit body describing the change.');
    expect(result).toContain('Message Preview:');
    expect(result).toContain('Update search functionality');
    expect(result).toContain('Diff Preview:');
    expect(result).toContain('diff --git a/file.ts b/file.ts');
    expect(result).toContain('+const change <= true;');
  });

  it('applies author and date filters to the search query', async () => {
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

    await searchCommits(mockClient, {
      query: 'repo:sourcegraph commit search',
      author: 'Alice Example',
      after: '2024-01-01',
      before: '2024-03-01',
      limit: 5,
    });

    expect(queryMock).toHaveBeenCalledWith(
      COMMIT_SEARCH_QUERY,
      expect.objectContaining({
        query: expect.stringContaining('type:commit'),
      }),
    );

    const queryString = queryMock.mock.calls[0][1].query;
    expect(queryString).toContain('author:"Alice Example"');
    expect(queryString).toContain('after:2024-01-01');
    expect(queryString).toContain('before:2024-03-01');
    expect(queryString).toContain('count:5');
  });

  it('returns a helpful message when no commits match', async () => {
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

    const result = await searchCommits(mockClient, {
      query: 'repo:sourcegraph nonexistent change',
    });

    expect(result).toContain('No commits found');
  });

  it('surface errors from the Sourcegraph API', async () => {
    const queryMock = vi.fn().mockRejectedValue(new Error('network timeout'));
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await searchCommits(mockClient, { query: 'repo:sourcegraph failure case' });

    expect(result).toContain('Error searching commits: network timeout');
  });
});
