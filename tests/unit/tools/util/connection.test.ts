import { describe, it, expect, vi } from 'vitest';
import { testConnection } from '../../../../src/tools/util/connection.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

describe('testConnection', () => {
  it('should return success when connection succeeds', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        site: {
          productVersion: '5.0.0',
          buildVersion: 'abc123',
          hasCodeIntelligence: true,
        },
        currentUser: {
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          organizations: {
            nodes: [{ name: 'testorg', displayName: 'Test Org' }],
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await testConnection(mockClient);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Successfully connected to Sourcegraph');
    expect(result.details).toEqual({
      version: '5.0.0',
      user: 'testuser',
      email: 'test@example.com',
      organizations: ['testorg'],
      codeIntelligence: true,
    });
  });

  it('should return failure when connection fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as SourcegraphClient;

    const result = await testConnection(mockClient);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Connection failed: Network error');
    expect(result.details).toBeUndefined();
  });

  it('should handle non-Error exceptions', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('String error'),
    } as unknown as SourcegraphClient;

    const result = await testConnection(mockClient);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Connection failed: String error');
  });
});
