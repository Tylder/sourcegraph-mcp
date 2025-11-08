/**
 * Tests for the repoInfo MCP tool implementation.
 *
 * This test suite verifies the repoInfo tool's ability to:
 * - Format repository information from GraphQL responses
 * - Handle various repository states (private, forked, archived, cloning)
 * - Display repository metadata (description, branches, stats, clone status)
 * - Process error conditions gracefully
 * - Validate response schema and performance expectations
 *
 * The tests use mocked GraphQL clients and factory functions to create
 * consistent test data and isolate the tool logic from network dependencies.
 */

import { describe, it, expect, vi } from 'vitest';
import { repoInfo } from '../../../../src/tools/repos/info.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';
import {
  createMockRepository,
  createMockClient,
  createMockClientWithError,
  validateRepositoryResponseSchema,
  expectResponseTime,
} from '../../../test-utils.js';

describe('repoInfo', () => {
  it('should format repository information correctly', async () => {
    // Assumptions: GraphQL response contains complete repository data
    // with all required fields (name, description, visibility, etc.)
    // Expected behavior: Formats repository info in structured text format
    // with clear labels and proper handling of all repository states
    const mockRepository = createMockRepository({
      isFork: true,
    });
    const mockClient = createMockClient({
      repository: mockRepository,
    });

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    // Validate response schema and content
    const schema = validateRepositoryResponseSchema(result);
    expect(schema.repository).toBe('github.com/test/repo');
    expect(schema.url).toBe('https://sourcegraph.com/github.com/test/repo');
    expect(schema.description).toBe('Test repository');
    expect(schema.defaultBranch).toBe('main');
    expect(schema.visibility).toBe('Public');
    expect(schema.fork).toBe('Yes');
    expect(schema.archived).toBe('No');
    expect(schema.cloneStatus).toBe('Cloned');
    expect(schema.stats).toEqual(['Can Administer: Yes', 'Last Updated: 2024-01-01T00:00:00Z']);
  });

  it('should respond quickly under normal load', async () => {
    const mockRepository = createMockRepository();
    const mockClient = createMockClient({
      repository: mockRepository,
    });

    const result = await expectResponseTime(
      async () => repoInfo(mockClient, { name: 'github.com/test/repo' }),
      50, // Should complete in under 50ms
    );

    // Verify we got a result
    expect(result).toContain('Repository: github.com/test/repo');
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
          viewerCanAdminister: false,
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
          viewerCanAdminister: false,
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
          viewerCanAdminister: false,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });

    expect(result).toContain('Clone Status: Not cloned');
  });

  describe('Error Handling', () => {
    it.each([
      {
        error: new Error('GraphQL error'),
        expectedMessage: 'Error fetching repository info: GraphQL error',
      },
      { error: 'string error', expectedMessage: 'Error fetching repository info: string error' },
    ])('should handle $error gracefully', async ({ error, expectedMessage }) => {
      const mockClient = createMockClientWithError(error);
      const result = await repoInfo(mockClient, { name: 'github.com/test/repo' });
      expect(result).toBe(expectedMessage);
    });
  });
});
