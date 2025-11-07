import { describe, it, expect, vi } from 'vitest';
import { repoCompareCommits } from '../../../src/tools/repos/repo_compare_commits.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('repoCompareCommits', () => {
  it('formats comparison results with commits and diffs', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/example',
          comparison: {
            commits: {
              nodes: [
                {
                  oid: 'abcdef1234567890',
                  abbreviatedOID: 'abcdef1',
                  subject: 'Add awesome feature',
                  author: {
                    person: {
                      displayName: 'Alice',
                      email: 'alice@example.com',
                    },
                    date: '2024-05-20T10:00:00Z',
                  },
                  url: 'https://sourcegraph.com/github.com/sourcegraph/example@abcdef1',
                },
              ],
              totalCount: 1,
            },
            fileDiffs: {
              nodes: [
                {
                  oldPath: 'README.md',
                  newPath: 'README.md',
                  stat: {
                    added: 5,
                    deleted: 2,
                  },
                  hunks: [
                    {
                      oldRange: { startLine: 1, lines: 5 },
                      newRange: { startLine: 1, lines: 6 },
                      body: '@@ -1,5 +1,6 @@\n-old line\n+new line',
                    },
                  ],
                },
              ],
              totalCount: 1,
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/example',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toContain('Repository: github.com/sourcegraph/example');
    expect(result).toContain('Base Revision: base');
    expect(result).toContain('Head Revision: head');
    expect(result).toContain('Commits: showing 1 of 1 total');
    expect(result).toContain('1. abcdef1 - Add awesome feature');
    expect(result).toContain('Author: Alice (2024-05-20T10:00:00Z)');
    expect(result).toContain('File Diffs: showing 1 of 1 total');
    expect(result).toContain('1. modified README.md');
    expect(result).toContain('Stats: +5 -2');
    expect(result).toContain('Hunk 1: -1,5 +1,6');
    expect(result).toContain('@@ -1,5 +1,6 @@');
  });

  it('returns error when base revision is missing', async () => {
    const mockClient = { query: vi.fn() } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/example',
      baseRev: '  ',
      headRev: 'head',
    });

    expect(result).toBe('Base revision is required for comparison.');
  });

  it('returns error when repository name is missing', async () => {
    const mockClient = { query: vi.fn() } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: '  ',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toBe('Repository name is required.');
  });

  it('returns error when head revision is missing', async () => {
    const mockClient = { query: vi.fn() } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/example',
      baseRev: 'base',
      headRev: '   ',
    });

    expect(result).toBe('Head revision is required for comparison.');
  });

  it('returns repository not found message', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ repository: null }),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'missing/repo',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toBe('Repository not found: missing/repo');
  });

  it('handles missing comparison information', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/example',
          comparison: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/example',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toBe(
      'No comparison available between base and head in github.com/sourcegraph/example.'
    );
  });

  it('surfaces query errors', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL failure')),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/example',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toBe('Error comparing revisions: GraphQL failure');
  });

  it('stringifies non-error rejections', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('timeout'),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/example',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toBe('Error comparing revisions: timeout');
  });

  it('summarises varied commit and diff metadata', async () => {
    const repeatedBody = Array.from(
      { length: 10 },
      (_, index) => `context line ${String(index + 1)}`
    ).join('\n');
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/complex',
          comparison: {
            commits: {
              nodes: [
                {
                  oid: '1111111111111111',
                  abbreviatedOID: '1111111',
                  subject: 'Implement feature',
                  author: {
                    person: { name: 'Dev One' },
                    date: '2024-01-01T00:00:00Z',
                  },
                  url: 'https://sourcegraph.com/github.com/sourcegraph/complex@1111111',
                },
                {
                  oid: '2222222222222222',
                  abbreviatedOID: '2222222',
                  subject: '   ',
                  author: {
                    person: { displayName: 'Dev Two' },
                  },
                },
                {
                  oid: '3333333333333333',
                  subject: 'Fix edge case',
                  author: {
                    date: '2024-02-02T00:00:00Z',
                  },
                },
                {
                  oid: '4444444444444444',
                  subject: 'Improve docs',
                  author: {
                    person: {
                      displayName: '   ',
                      name: ' ',
                      email: '   ',
                    },
                  },
                },
              ],
              totalCount: 4,
            },
            fileDiffs: {
              nodes: [
                {
                  oldPath: 'src/old.ts',
                  newPath: 'src/new.ts',
                  stat: { added: 10, changed: 2, deleted: 1 },
                  hunks: [
                    {
                      oldRange: { startLine: 5, lines: 3 },
                      newRange: { startLine: 7, lines: 4 },
                      body: repeatedBody,
                    },
                  ],
                },
                {
                  oldPath: null,
                  newPath: 'docs/added.md',
                  stat: { added: 5, deleted: 0 },
                  hunks: [],
                },
                {
                  oldPath: 'src/deleted.ts',
                  newPath: null,
                  stat: { added: 0, deleted: 7 },
                  hunks: [],
                },
                {
                  oldPath: 'src/unchanged.ts',
                  newPath: 'src/unchanged.ts',
                  stat: { added: 1, changed: 1, deleted: 1 },
                  hunks: [
                    {
                      oldRange: null,
                      newRange: { startLine: 42, lines: null },
                      body: '@@ -0,0 +42 @@\n+new content',
                    },
                  ],
                },
                {
                  oldPath: null,
                  newPath: null,
                  stat: null,
                  hunks: [
                    {
                      oldRange: { startLine: null, lines: null },
                      newRange: { startLine: null, lines: null },
                      body: '@@ -0,0 +0,0 @@\n context without filename',
                    },
                  ],
                },
              ],
              totalCount: 4,
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: ' github.com/sourcegraph/complex ',
      baseRev: ' base ',
      headRev: ' head ',
    });

    expect(result).toContain('Repository: github.com/sourcegraph/complex');
    expect(result).toContain('Base Revision: base');
    expect(result).toContain('Head Revision: head');
    expect(result).toContain('Commits: showing 4 of 4 total');
    expect(result).toContain('1. 1111111 - Implement feature');
    expect(result).toContain('Author: Dev One (2024-01-01T00:00:00Z)');
    expect(result).toContain('URL: https://sourcegraph.com/github.com/sourcegraph/complex@1111111');
    expect(result).toContain('2. 2222222 - (no subject)');
    expect(result).toContain('Author: Dev Two');
    expect(result).toContain('3. 3333333333333333 - Fix edge case');
    expect(result).toContain('Author: 2024-02-02T00:00:00Z');
    expect(result).toContain('4. 4444444444444444 - Improve docs');
    expect(result).toContain('Author: Unknown');
    expect(result).toContain('File Diffs: showing 5 of 4 total');
    expect(result).toContain('renamed from src/old.ts to src/new.ts');
    expect(result).toContain('Stats: +10 ~2 -1');
    expect(result).toContain('Hunk 1: -5,3 +7,4');
    expect(result).toContain('context line 1');
    expect(result).toContain('context line 8');
    expect(result).toContain('…');
    expect(result).toContain('added docs/added.md');
    expect(result).toContain('Stats: +5 -0');
    expect(result).toContain('No diff hunks available (file may be binary or diff omitted).');
    expect(result).toContain('deleted src/deleted.ts');
    expect(result).toContain('Stats: +0 -7');
    expect(result).toContain('No diff hunks available (file may be binary or diff omitted).');
    expect(result).toContain('modified src/unchanged.ts');
    expect(result).toContain('Hunk 1: -∅ +42');
    expect(result).toContain('+new content');
    expect(result).toContain('modified unknown file');
    expect(result).toContain('Stats: unavailable.');
    expect(result).toContain('@@ -0,0 +0,0 @@');
    expect(result).toContain('context without filename');
  });

  it('handles empty commits and file diffs', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/empty',
          comparison: {
            commits: { nodes: [], totalCount: 0 },
            fileDiffs: { nodes: [], totalCount: 0 },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/empty',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toContain('Commits: showing 0 of 0 total');
    expect(result).toContain('No commits found in this comparison.');
    expect(result).toContain('File Diffs: showing 0 of 0 total');
    expect(result).toContain('No file changes detected between the revisions.');
  });

  it('renders placeholder author when data is null', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/sourcegraph/no-author',
          comparison: {
            commits: {
              nodes: [
                {
                  oid: '9999999999999999',
                  abbreviatedOID: '9999999',
                  subject: 'Hard to attribute',
                  author: null,
                },
              ],
              totalCount: 1,
            },
            fileDiffs: {
              nodes: [],
              totalCount: 0,
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await repoCompareCommits(mockClient, {
      repo: 'github.com/sourcegraph/no-author',
      baseRev: 'base',
      headRev: 'head',
    });

    expect(result).toContain('Author: Unknown');
  });
});
