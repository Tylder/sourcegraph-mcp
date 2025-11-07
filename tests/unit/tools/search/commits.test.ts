import { describe, it, expect, vi } from 'vitest';
import { searchCommits } from '../../../../src/tools/search/search_commits.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('searchCommits', () => {
  it('should format commit search results correctly', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitSearchResult',
              commit: {
                repository: {
                  name: 'github.com/test/repo',
                  url: '/github.com/test/repo',
                },
                oid: 'abcdef1234567890',
                abbreviatedOID: 'abcdef1',
                url: '/github.com/test/repo/-/commit/abcdef1234567890',
                subject: 'Fix authentication bug',
                body: 'Ensure tokens are validated correctly',
                author: {
                  person: {
                    displayName: 'Jane Doe',
                    email: 'jane@example.com',
                  },
                  date: '2024-03-01T12:00:00Z',
                },
              },
              messagePreview: {
                value: 'Fix authentication bug',
              },
              diffPreview: {
                value: '+ return validateToken(token);',
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'auth bug' });

    expect(output).toContain('Search Query: auth bug');
    expect(output).toContain('Result Count: 1');
    expect(output).toContain('Repository: github.com/test/repo');
    expect(output).toContain('Commit: abcdef1');
    expect(output).toContain('Author: Jane Doe');
    expect(output).toContain('Date: 2024-03-01T12:00:00Z');
    expect(output).toContain('Subject: Fix authentication bug');
    expect(output).toContain('Body:\nEnsure tokens are validated correctly');
    expect(output).toContain('Message Preview:\nFix authentication bug');
    expect(output).toContain('Diff Preview:\n+ return validateToken(token);');
  });

  it('should apply filters and limit to the query', async () => {
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
      query: 'fix bug',
      author: 'John Smith',
      after: '2024-01-01',
      before: '2024-02-01',
      limit: 5,
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: 'type:commit fix bug author:"John Smith" after:2024-01-01 before:2024-02-01 count:5',
      }),
    );
  });

  it('should handle filters with whitespace-only values', async () => {
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
      query: 'fix',
      author: '   ',
      limit: 1,
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: 'type:commit fix count:1',
      }),
    );
  });

  it('should handle results with missing optional fields', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitSearchResult',
              commit: {
                repository: {
                  name: 'github.com/test/repo',
                  url: '/github.com/test/repo',
                },
                oid: '1234567890abcdef',
                url: '/github.com/test/repo/-/commit/1234567890abcdef',
                author: {
                  person: {
                    email: 'dev@example.com',
                  },
                },
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'refactor' });

    expect(output).toContain('Repository: github.com/test/repo');
    expect(output).toContain('Commit: 1234567890abcdef');
    expect(output).toContain('Author: dev@example.com');
    expect(output).toContain('Date: Unknown date');
    expect(output).toContain('Subject: (no subject)');
    expect(output).not.toContain('Body:');
    expect(output).not.toContain('Message Preview:');
    expect(output).not.toContain('Diff Preview:');
  });

  it('should normalize HTML markup in previews', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitSearchResult',
              commit: {
                repository: { name: 'github.com/test/repo' },
                oid: 'abcdef1234567890',
                url: '/commit/abcdef1234567890',
                author: {
                  person: { displayName: 'Formatter' },
                  date: '2024-02-02T00:00:00Z',
                },
                subject: 'Normalize previews',
              },
              messagePreview: {
                value: 'Refactor <span class="match">auth</span> &lt; guard',
              },
              diffPreview: {
                value:
                  'diff --git a/auth.ts b/auth.ts\n<span class="match">+export const ready = true;&lt;/span>\n',
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'normalize previews' });

    expect(output).toContain('Message Preview:');
    expect(output).toContain('Refactor auth < guard');
    expect(output).toContain('Diff Preview:');
    expect(output).toContain('+export const ready = true;');
  });

  it('should ignore previews that only contain whitespace', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitSearchResult',
              commit: {
                repository: { name: 'github.com/test/repo' },
                oid: 'abcdef',
                url: '/commit/abcdef',
                author: {
                  person: { displayName: 'Tester' },
                  date: '2024-01-01T00:00:00Z',
                },
                subject: 'Whitespace previews',
              },
              messagePreview: { value: '   ' },
              diffPreview: { value: '\n\n' },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'test' });

    expect(output).not.toContain('Message Preview:');
    expect(output).not.toContain('Diff Preview:');
  });

  it('should skip non-commit results and keep numbering sequential', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            { __typename: 'FileMatch' },
            {
              __typename: 'CommitSearchResult',
              commit: {
                repository: { name: 'github.com/test/repo' },
                oid: 'abcdef',
                url: '/commit/abcdef',
                author: {
                  person: { displayName: 'Tester' },
                  date: '2024-01-01T00:00:00Z',
                },
                subject: 'Initial commit',
              },
            },
          ],
          matchCount: 2,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'test' });

    expect(output).toContain('Result Count: 2');
    expect(output).toContain('Result 1:');
    expect(output).not.toContain('Result 2:');
  });

  it('should handle missing repository and author details gracefully', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [
            {
              __typename: 'CommitSearchResult',
              commit: {
                oid: 'deadbeef',
                url: '/commit/deadbeef',
              },
            },
          ],
          matchCount: 1,
          limitHit: false,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'test' });

    expect(output).toContain('Repository: Unknown repository');
    expect(output).toContain('Author: Unknown author');
  });

  it('should note when result limit is hit', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      search: {
        results: {
          results: [],
          matchCount: 50,
          limitHit: true,
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'fix', limit: 10 });

    expect(output).toContain('Note: Result limit hit, showing first 10 commits');
  });

  it('should show message when no commits found', async () => {
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

    const output = await searchCommits(mockClient, { query: 'no matches' });

    expect(output).toContain('No commits found');
  });

  it('should handle query errors gracefully', async () => {
    const queryMock = vi.fn().mockRejectedValue(new Error('GraphQL failure'));
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'test' });

    expect(output).toContain('Error searching commits: GraphQL failure');
  });

  it('should handle non-Error rejections', async () => {
    const queryMock = vi.fn().mockRejectedValue('string error');
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const output = await searchCommits(mockClient, { query: 'test' });

    expect(output).toContain('Error searching commits: string error');
  });
});
