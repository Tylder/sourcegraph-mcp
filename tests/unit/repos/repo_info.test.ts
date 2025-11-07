import { describe, it, expect, vi } from 'vitest';
import { repoInfo, formatRepoInfo } from '../../../src/tools/repos/repo_info.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('repoInfo handler', () => {
  it('returns repository metadata with clone status, default branch, and stats', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/sourcegraph',
          description: ' Sourcegraph platform ',
          url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
          isPrivate: false,
          isFork: true,
          isArchived: false,
          viewerCanAdminister: true,
          diskUsage: 123456,
          mirrorInfo: {
            cloned: true,
            cloneInProgress: false,
            cloneProgress: null,
          },
          defaultBranch: {
            displayName: 'main',
          },
          updatedAt: '2024-04-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, {
      name: 'github.com/sourcegraph/sourcegraph',
    });

    expect(result).toEqual({
      name: 'github.com/sourcegraph/sourcegraph',
      description: 'Sourcegraph platform',
      url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
      defaultBranch: 'main',
      cloneStatus: { state: 'CLONED' },
      stats: {
        isPrivate: false,
        isFork: true,
        isArchived: false,
        viewerCanAdminister: true,
        diskUsage: 123456,
        updatedAt: '2024-04-01T00:00:00Z',
      },
    });

    const formatted = formatRepoInfo(result);
    expect(formatted).toContain('Repository: github.com/sourcegraph/sourcegraph');
    expect(formatted).toContain('Description: Sourcegraph platform');
    expect(formatted).toContain('Default Branch: main');
    expect(formatted).toContain('Clone Status: Cloned');
    expect(formatted).toContain('Repository Stats:');
    expect(formatted).toContain('Can Administer: Yes');
    expect(formatted).toContain('Disk Usage: 123456 KB');
    expect(formatted).toContain('Last Updated: 2024-04-01T00:00:00Z');
  });

  it('throws a descriptive error when the repository is missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: null,
      }),
    } as unknown as SourcegraphClient;

    await expect(repoInfo(mockClient, { name: 'github.com/example/missing' })).rejects.toThrow(
      'Repository not found: github.com/example/missing'
    );
  });

  it('sanitises clone progress and handles clone-in-progress status', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/in-progress',
          description: 'Example repo',
          url: 'https://sourcegraph.com/github.com/example/in-progress',
          isPrivate: false,
          isFork: false,
          isArchived: false,
          mirrorInfo: {
            cloned: false,
            cloneInProgress: true,
            cloneProgress: ' 42% ',
          },
          defaultBranch: null,
          updatedAt: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, {
      name: 'github.com/example/in-progress',
    });

    expect(result.cloneStatus).toEqual({ state: 'CLONING', progress: '42%' });
    expect(formatRepoInfo(result)).toContain('Clone Status: Cloning (42%)');
  });

  it('falls back to a generic cloning progress message when progress text is empty', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/empty-progress',
          description: '   ',
          url: 'https://sourcegraph.com/github.com/example/empty-progress',
          isPrivate: false,
          isFork: false,
          isArchived: false,
          viewerCanAdminister: false,
          diskUsage: 2048,
          mirrorInfo: {
            cloned: false,
            cloneInProgress: true,
            cloneProgress: '   ',
          },
          defaultBranch: {
            displayName: 'main',
          },
          updatedAt: '2024-02-02T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, {
      name: 'github.com/example/empty-progress',
    });

    expect(result.description).toBeNull();
    expect(result.cloneStatus).toEqual({ state: 'CLONING' });

    const formatted = formatRepoInfo(result);
    expect(formatted).toContain('Clone Status: Cloning (in progress)');
    expect(formatted).toContain('Repository Stats:');
    expect(formatted).toContain('Can Administer: No');
    expect(formatted).toContain('Disk Usage: 2048 KB');
    expect(formatted).toContain('Last Updated: 2024-02-02T00:00:00Z');
  });

  it('treats missing mirror info as unknown clone status and omits optional stats', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/unknown',
          description: '',
          url: 'https://sourcegraph.com/github.com/example/unknown',
          isPrivate: true,
          isFork: false,
          isArchived: false,
          mirrorInfo: null,
          defaultBranch: {
            displayName: 'main',
          },
          updatedAt: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, {
      name: 'github.com/example/unknown',
    });

    expect(result.description).toBeNull();
    expect(result.cloneStatus).toEqual({ state: 'UNKNOWN' });
    expect(result.stats.viewerCanAdminister).toBeUndefined();
    expect(result.stats.diskUsage).toBeUndefined();

    const formatted = formatRepoInfo(result);
    expect(formatted).toContain('Clone Status: Unknown');
    expect(formatted).not.toContain('Repository Stats:');
  });

  it('reports a not-cloned status when cloning has not started', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/not-cloned',
          description: null,
          url: 'https://sourcegraph.com/github.com/example/not-cloned',
          isPrivate: false,
          isFork: false,
          isArchived: true,
          mirrorInfo: {
            cloned: false,
            cloneInProgress: false,
            cloneProgress: null,
          },
          defaultBranch: null,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, {
      name: 'github.com/example/not-cloned',
    });

    expect(result.cloneStatus).toEqual({ state: 'NOT_CLONED' });
    expect(formatRepoInfo(result)).toContain('Clone Status: Not cloned');
  });

  it('wraps GraphQL errors with additional context', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL request failed')),
    } as unknown as SourcegraphClient;

    await expect(
      repoInfo(mockClient, {
        name: 'github.com/example/error',
      })
    ).rejects.toThrow('Error fetching repository info: GraphQL request failed');
  });

  it('handles unexpected error shapes when querying', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('timed out'),
    } as unknown as SourcegraphClient;

    await expect(
      repoInfo(mockClient, {
        name: 'github.com/example/unexpected-error',
      })
    ).rejects.toThrow('Error fetching repository info: timed out');
  });
});
