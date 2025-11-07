import { describe, it, expect, vi } from 'vitest';
import { repoList, type RepoListParams } from '../../../src/tools/repos/repo_list.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('repoList', () => {
  it('formats repository list with metadata and ordering', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [
            {
              name: 'github.com/sourcegraph/sourcegraph',
              url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
              description: 'Code intelligence platform',
              isPrivate: false,
              isFork: false,
              isArchived: false,
              viewerCanAdminister: true,
              mirrorInfo: { cloned: true, cloneInProgress: false },
              defaultBranch: { displayName: 'main' },
              updatedAt: '2024-01-01T00:00:00Z',
            },
            {
              name: 'github.com/example/archived',
              url: 'https://sourcegraph.com/github.com/example/archived',
              description: null,
              isPrivate: true,
              isFork: true,
              isArchived: true,
              viewerCanAdminister: false,
              mirrorInfo: { cloned: false, cloneInProgress: true },
              defaultBranch: null,
              updatedAt: '2023-12-25T15:00:00Z',
            },
          ],
          totalCount: 2,
          pageInfo: { hasNextPage: true, endCursor: 'next-cursor' },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {
      query: 'sourcegraph',
      first: 5,
      after: 'prev-cursor',
    });

    expect(result).toContain('Repository List');
    expect(result).toContain('Total Count: 2');
    expect(result).toContain('Requested: 5');
    expect(result).toContain('Query: sourcegraph');
    expect(result).toContain('Has Next Page: yes');
    expect(result).toContain('Order: REPOSITORY_NAME (ASC)');
    expect(result).toContain('Starting Cursor: prev-cursor');
    expect(result).toContain('Next Page Cursor: next-cursor');

    expect(result).toContain('Repository 1:');
    expect(result).toContain('Name: github.com/sourcegraph/sourcegraph');
    expect(result).toContain('URL: https://sourcegraph.com/github.com/sourcegraph/sourcegraph');
    expect(result).toContain('Description: Code intelligence platform');
    expect(result).toContain('Status: admin');
    expect(result).toContain('Default Branch: main');
    expect(result).toContain('Updated At: 2024-01-01T00:00:00Z');

    expect(result).toContain('Repository 2:');
    expect(result).toContain('Status: private, fork, archived, not cloned, cloning');
    expect(result).toContain('Updated At: 2023-12-25T15:00:00Z');
  });

  it('sends defaulted variables to the query', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [],
          totalCount: 0,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    } as unknown as SourcegraphClient;

    const params: RepoListParams = {
      query: '  repo-pattern  ',
      after: 'cursor123',
    };

    await repoList(mockClient, params);

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        first: 20,
        query: 'repo-pattern',
        after: 'cursor123',
        orderBy: { field: 'REPOSITORY_NAME', direction: 'ASC' },
      })
    );
  });

  it('honors custom ordering preferences', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [],
          totalCount: 0,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    } as unknown as SourcegraphClient;

    await repoList(mockClient, {
      orderBy: { field: 'STARS', direction: 'DESC' },
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        orderBy: { field: 'STARS', direction: 'DESC' },
      })
    );
  });

  it('handles empty repositories gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [],
          totalCount: 0,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toContain('Has Next Page: no');
    expect(result).toContain('No repositories found.');
  });

  it('reports errors from the GraphQL client', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL failure')),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toBe('Error listing repositories: GraphQL failure');
  });

  it('surfaces non-Error rejection reasons', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('network issue'),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toBe('Error listing repositories: network issue');
  });

  it('omits status line when repository has no notable flags', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [
            {
              name: 'github.com/sourcegraph/clean-repo',
              url: 'https://sourcegraph.com/github.com/sourcegraph/clean-repo',
              description: null,
              isPrivate: false,
              isFork: false,
              isArchived: false,
              viewerCanAdminister: false,
              mirrorInfo: null,
              defaultBranch: null,
              updatedAt: '2024-02-02T00:00:00Z',
            },
          ],
          totalCount: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toContain('Repository 1:');
    expect(result).toContain('Name: github.com/sourcegraph/clean-repo');
    expect(result).not.toContain('Status:');
  });
});
