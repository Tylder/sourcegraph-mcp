import { describe, it, expect, vi } from 'vitest';
import { repoBranches } from '../../../../src/tools/repos/branches.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('repoBranches', () => {
  it('should format branch results correctly', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: 'https://sourcegraph.com/github.com/test/repo',
          defaultBranch: { displayName: 'main' },
          branches: {
            nodes: [
              {
                name: 'refs/heads/main',
                displayName: 'main',
                abbreviatedName: 'main',
                url: 'https://sourcegraph.com/github.com/test/repo@main',
                target: { abbreviatedOID: 'abc1234' },
              },
              {
                name: 'refs/heads/feature/test',
                displayName: 'feature/test',
                abbreviatedName: 'feature/test',
                url: 'https://sourcegraph.com/github.com/test/repo@feature/test',
                target: { oid: 'def5678' },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, {
      repo: 'github.com/test/repo',
      query: 'feature',
      limit: 5,
    });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('Default Branch: main');
    expect(result).toContain('Filter: feature');
    expect(result).toContain('Returned Branches: 2');
    expect(result).toContain('Branch 1: main');
    expect(result).toContain('Target: abc1234');
    expect(result).toContain('Branch 2: feature/test');
    expect(result).toContain('Target: def5678');
  });

  it('should call query with provided limit and filter', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: { nodes: [], pageInfo: { hasNextPage: false } },
        },
      }),
    } as unknown as SourcegraphClient;

    await repoBranches(mockClient, { repo: 'repo', query: 'main', limit: 15 });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: 'repo',
        query: 'main',
        first: 15,
      })
    );
  });

  it('should trim the query parameter before sending it to GraphQL', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: { nodes: [], pageInfo: { hasNextPage: false } },
        },
      }),
    } as unknown as SourcegraphClient;

    await repoBranches(mockClient, { repo: 'repo', query: '  feature/test  ' });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: 'repo',
        query: 'feature/test',
      })
    );
  });

  it('should omit the query variable when only whitespace is provided', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: { nodes: [], pageInfo: { hasNextPage: false } },
        },
      }),
    } as unknown as SourcegraphClient;

    await repoBranches(mockClient, { repo: 'repo', query: '   ' });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.any(String),
      {
        name: 'repo',
        first: 20,
      }
    );
  });

  it('should handle repository not found', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ repository: null }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'missing/repo' });

    expect(result).toContain('Repository not found: missing/repo');
  });

  it('should handle no branches', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: { nodes: [], pageInfo: { hasNextPage: false } },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'repo' });

    expect(result).toContain('No branches found');
  });

  it('should note additional branches when hasNextPage is true', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: {
            nodes: [
              {
                displayName: 'main',
                target: { abbreviatedOID: '1234567' },
              },
            ],
            pageInfo: { hasNextPage: true },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'repo', limit: 1 });

    expect(result).toContain('Additional branches available beyond the 1 shown');
  });

  it('should handle errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL error')),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'repo' });

    expect(result).toContain('Error fetching branches: GraphQL error');
  });

  it('should handle non-Error rejections gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('rate limited'),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'repo' });

    expect(result).toContain('Error fetching branches: rate limited');
  });

  it('should handle branches missing optional fields', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'repo' });

    expect(result).toContain('Returned Branches: 0');
  });

  it('should label branches as unknown when no identifiers are present', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'repo',
          url: 'url',
          branches: {
            nodes: [
              {
                name: null,
                displayName: undefined,
                abbreviatedName: undefined,
                target: {},
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoBranches(mockClient, { repo: 'repo' });

    expect(result).toContain('Branch 1: unknown');
  });
});
