import { describe, it, expect, vi } from 'vitest';
import { repoInfo } from '../../../../src/tools/repos/info.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('repoInfo', () => {
  it('should format repository information correctly', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          description: 'Test repository',
          url: 'https://sourcegraph.com/github.com/test/repo',
          isPrivate: false,
          isFork: true,
          isArchived: false,
          viewerPermission: 'ADMIN',
          mirrorInfo: {
            cloned: true,
            cloneInProgress: false,
            cloneProgress: null,
          },
          defaultBranch: {
            displayName: 'main',
          },
          diskUsage: 10485760,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('Description: Test repository');
    expect(result).toContain('Default Branch: main');
    expect(result).toContain('Visibility: Public');
    expect(result).toContain('Fork: Yes');
    expect(result).toContain('Clone Status: Cloned');
    expect(result).toContain('Disk Usage: 10.00 MB');
    expect(result).toContain('Viewer Permission: ADMIN');
    expect(result).toContain('Last Updated: 2024-01-01T00:00:00Z');
  });

  it('should handle missing repository', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: null,
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'missing/repo' });

    expect(result).toBe('Repository not found: missing/repo');
  });

  it('should handle repositories without description or stats', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          description: '',
          url: 'https://sourcegraph.com/github.com/test/repo',
          isPrivate: true,
          isFork: false,
          isArchived: true,
          mirrorInfo: {
            cloned: false,
            cloneInProgress: true,
            cloneProgress: '50%',
          },
          defaultBranch: null,
          diskUsage: null,
          viewerPermission: null,
          updatedAt: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toContain('Description: No description provided.');
    expect(result).toContain('Default Branch: Not set');
    expect(result).toContain('Visibility: Private');
    expect(result).toContain('Archived: Yes');
    expect(result).toContain('Clone Status: Cloning (50%)');
    expect(result).not.toContain('Repository Stats:');
  });

  it('should show in-progress cloning when progress is unavailable', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          description: 'Test repository',
          url: 'https://sourcegraph.com/github.com/test/repo',
          isPrivate: false,
          isFork: false,
          isArchived: false,
          mirrorInfo: {
            cloned: false,
            cloneInProgress: true,
            cloneProgress: null,
          },
          defaultBranch: {
            displayName: 'main',
          },
          diskUsage: 1048576,
          viewerPermission: 'READ',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toContain('Clone Status: Cloning (in progress)');
  });

  it('should report unknown clone status when mirror info is unavailable', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          description: 'Test repository',
          url: 'https://sourcegraph.com/github.com/test/repo',
          isPrivate: false,
          isFork: false,
          isArchived: false,
          mirrorInfo: null,
          defaultBranch: {
            displayName: 'main',
          },
          diskUsage: 1048576,
          viewerPermission: 'READ',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toContain('Clone Status: Unknown');
  });

  it('should report not cloned status when repository is not cloned', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          description: 'Test repository',
          url: 'https://sourcegraph.com/github.com/test/repo',
          isPrivate: false,
          isFork: false,
          isArchived: false,
          mirrorInfo: {
            cloned: false,
            cloneInProgress: false,
            cloneProgress: null,
          },
          defaultBranch: {
            displayName: 'main',
          },
          diskUsage: 1048576,
          viewerPermission: 'READ',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toContain('Clone Status: Not cloned');
  });

  it('should handle query errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL error')),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toBe('Error fetching repository info: GraphQL error');
  });

  it('should handle non-Error exceptions', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('string error'),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toBe('Error fetching repository info: string error');
  });
});
