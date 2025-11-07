import { describe, it, expect, vi } from 'vitest';
import { getUserInfo } from '../../../../src/tools/util/user_info.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('getUserInfo', () => {
  it('returns user details when current user is available', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      currentUser: {
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        organizations: {
          nodes: [
            { name: 'org-1', displayName: 'Org One' },
            { name: 'org-2', displayName: null },
          ],
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await getUserInfo(mockClient);

    expect(result).toEqual({
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      organizations: [
        { name: 'org-1', displayName: 'Org One' },
        { name: 'org-2', displayName: null },
      ],
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('throws a helpful error when no user is returned', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      currentUser: null,
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await expect(getUserInfo(mockClient)).rejects.toThrow(
      'Failed to fetch user info: No authenticated user found. Please check your access token.',
    );
  });

  it('wraps GraphQL errors with additional context', async () => {
    const queryMock = vi.fn().mockRejectedValue(new Error('GraphQL request failed'));
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await expect(getUserInfo(mockClient)).rejects.toThrow(
      'Failed to fetch user info: GraphQL request failed',
    );
  });

  it('normalizes missing display names to null', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      currentUser: {
        username: 'bob',
        email: 'bob@example.com',
        organizations: {
          nodes: [{ name: 'org-1' }],
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await getUserInfo(mockClient);

    expect(result).toEqual({
      username: 'bob',
      email: 'bob@example.com',
      displayName: null,
      organizations: [{ name: 'org-1', displayName: null }],
    });
  });

  it('handles unexpected non-error exceptions gracefully', async () => {
    const queryMock = vi.fn().mockRejectedValue('boom');
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await expect(getUserInfo(mockClient)).rejects.toThrow('Failed to fetch user info: boom');
  });
});
