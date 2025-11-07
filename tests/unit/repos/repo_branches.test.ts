import { describe, it, expect, vi } from 'vitest';
import { repoBranches } from '../../../src/tools/repos/repo_branches.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('repoBranches', () => {
  it('paginates through branches until the limit is satisfied', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          defaultBranch: { displayName: 'main' },
          branches: {
            nodes: [
              {
                name: 'refs/heads/main',
                displayName: 'main',
                abbrevName: 'main',
                url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph@main',
                target: { abbreviatedOID: 'abc1234' },
              },
              {
                name: 'refs/heads/release',
                displayName: 'release',
                abbrevName: 'release',
                url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph@release',
                target: { abbreviatedOID: 'def5678' },
              },
              {
                name: 'refs/heads/feature/a',
                displayName: 'feature/a',
                abbrevName: 'feature/a',
                url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph@feature/a',
                target: { abbreviatedOID: 'ghi9012' },
              },
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
          },
        },
      })
      .mockResolvedValueOnce({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          defaultBranch: { displayName: 'main' },
          branches: {
            nodes: [
              {
                name: 'refs/heads/feature/b',
                displayName: 'feature/b',
                abbrevName: 'feature/b',
                url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph@feature/b',
                target: { abbreviatedOID: 'jkl3456' },
              },
              {
                name: 'refs/heads/feature/c',
                displayName: 'feature/c',
                abbrevName: 'feature/c',
                url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph@feature/c',
                target: { abbreviatedOID: 'mno7890' },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      });

    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      query: ' feature ',
      limit: 5,
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        name: 'github.com/sourcegraph/sourcegraph',
        first: 5,
        query: 'feature',
      })
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        name: 'github.com/sourcegraph/sourcegraph',
        first: 2,
        query: 'feature',
        after: 'cursor-1',
      })
    );

    expect(result).toContain('Repository: github.com/sourcegraph/sourcegraph');
    expect(result).toContain('Default Branch: main');
    expect(result).toContain('Filter: feature');
    expect(result).toContain('Returned Branches: 5');
    expect(result).toContain('Branch 1: main');
    expect(result).toContain('Branch 5: feature/c');
  });

  it('omits the query variable when only whitespace is provided', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
        branches: {
          nodes: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });

    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      query: '   ',
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.any(String),
      {
        name: 'github.com/sourcegraph/sourcegraph',
        first: 20,
      }
    );
  });

  it('handles repository not being found', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ repository: null }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/missing',
    });

    expect(result).toContain('Repository not found: github.com/sourcegraph/missing');
  });

  it('handles repositories with no branches', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          branches: {
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      query: 'feature',
    });

    expect(result).toContain('No branches found.');
    expect(result).toContain('Try adjusting your filter or increasing the limit.');
  });

  it('includes a note when additional branches are available beyond the requested limit', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          branches: {
            nodes: [
              {
                name: 'refs/heads/main',
                displayName: 'main',
                abbrevName: 'main',
                target: { abbreviatedOID: 'abc1234' },
              },
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      limit: 1,
    });

    expect(result).toContain('Note: Additional branches available beyond the 1 shown.');
  });

  it('handles GraphQL errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL failure')),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
    });

    expect(result).toContain('Error fetching branches: GraphQL failure');
  });

  it('handles repositories that omit branch connection data', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          branches: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
    });

    expect(result).toContain('Returned Branches: 0');
    expect(result).toContain('No branches found.');
  });

  it('handles non-Error rejections gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('rate limited'),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
    });

    expect(result).toContain('Error fetching branches: rate limited');
  });

  it('falls back to the full target OID when an abbreviated value is unavailable', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          branches: {
            nodes: [
              {
                name: 'refs/heads/dev',
                displayName: 'dev',
                target: { oid: 'abcdef1234567890' },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
    });

    expect(result).toContain('  Target: abcdef1234567890');
  });

  it('skips null branch nodes returned from the API', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          branches: {
            nodes: [
              null,
              {
                name: 'refs/heads/main',
                displayName: 'main',
                abbrevName: 'main',
                target: { abbreviatedOID: 'abc1234' },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      limit: 5,
    });

    expect(result).toContain('Returned Branches: 1');
    expect(result).toContain('Branch 1: main');
    expect(result).not.toContain('Branch 2:');
  });

  it('labels branches as unknown when all identifying fields are missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          branches: {
            nodes: [
              {
                name: null,
                displayName: undefined,
                abbrevName: undefined,
                target: {},
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
    });

    expect(result).toContain('Branch 1: unknown');
  });
});
