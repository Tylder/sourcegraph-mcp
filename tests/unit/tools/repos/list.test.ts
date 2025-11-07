import { describe, it, expect, vi } from 'vitest';
import { repoList } from '../../../../src/tools/repos/list.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('repoList', () => {
  it('should format repository list correctly', async () => {
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
              defaultBranch: { displayName: 'main' },
              mirrorInfo: { cloned: true, cloneInProgress: false },
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          totalCount: 1,
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {
      query: 'sourcegraph',
      first: 5,
    });

    expect(result).toContain('Repository List');
    expect(result).toContain('Total Count: 1');
    expect(result).toContain('Requested: 5');
    expect(result).toContain('Query: sourcegraph');
    expect(result).toContain('Has Next Page: no');
    expect(result).toContain('Repository 1:');
    expect(result).toContain('Name: github.com/sourcegraph/sourcegraph');
    expect(result).toContain('URL: https://sourcegraph.com/github.com/sourcegraph/sourcegraph');
    expect(result).toContain('Description: Code intelligence platform');
    expect(result).toContain('Status: admin');
    expect(result).toContain('Default Branch: main');
    expect(result).toContain('Updated At: 2024-01-01T00:00:00Z');
  });

  it('should pass variables to the query', async () => {
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
      query: 'test',
      first: 20,
      after: 'cursor123',
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: 'test',
        first: 20,
        after: 'cursor123',
      })
    );
  });

  it('should handle missing optional fields gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [
            {
              name: 'github.com/example/repo',
              url: 'https://sourcegraph.com/github.com/example/repo',
              description: null,
              isPrivate: true,
              isFork: true,
              isArchived: true,
              viewerCanAdminister: false,
              defaultBranch: null,
              mirrorInfo: { cloned: false, cloneInProgress: true },
              updatedAt: '2023-12-31T23:59:59Z',
            },
          ],
          totalCount: 1,
          pageInfo: { hasNextPage: true, endCursor: 'next-cursor' },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toContain('Has Next Page: yes');
    expect(result).not.toContain('Description:');
    expect(result).toContain('Status: private, fork, archived, not cloned, cloning');
    expect(result).not.toContain('Default Branch:');
    expect(result).toContain('Next Page Cursor: next-cursor');
  });

  it('should handle empty results', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repositories: {
          nodes: [],
          totalCount: 0,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, { query: 'nothing' });

    expect(result).toContain('Has Next Page: no');
    expect(result).toContain('No repositories found');
  });

  it('should handle errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL failure')),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toContain('Error listing repositories: GraphQL failure');
  });

  it('should handle non-Error exceptions', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('network issue'),
    } as unknown as SourcegraphClient;

    const result = await repoList(mockClient, {});

    expect(result).toContain('Error listing repositories: network issue');
  });
});
