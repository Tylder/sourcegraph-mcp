import { describe, it, expect, vi } from 'vitest';
import { fileBlame } from '../../../src/tools/files/file_blame.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('fileBlame', () => {
  it('returns line-level blame metadata for a file', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/test/repo',
        url: '/github.com/test/repo',
        commit: {
          oid: 'abcdef1234567890',
          blob: {
            path: null,
            blame: [
              {
                startLine: 1,
                endLine: 2,
                author: {
                  date: '2024-01-01T00:00:00Z',
                  person: {
                    displayName: 'Alice',
                    email: 'alice@example.com',
                  },
                },
                commit: {
                  oid: 'abcdef1234567890abcdef1234567890abcdef12',
                  abbreviatedOID: 'abcdef1',
                  url: 'https://example.com/commit/abcdef1',
                  subject: 'Initial commit',
                },
              },
              {
                startLine: 3,
                endLine: 3,
                author: {
                  date: '2024-01-02T12:34:56Z',
                  person: {
                    displayName: null,
                    email: 'bob@example.com',
                  },
                },
                commit: {
                  oid: 'fedcba0987654321fedcba0987654321fedcba09',
                  abbreviatedOID: null,
                  url: ' ',
                  subject: '  ',
                },
              },
            ],
          },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toContain('Repository: github.com/test/repo');
    expect(result).toContain('Path: src/index.ts');
    expect(result).toContain('Revision Requested: main');
    expect(result).toContain('Line | Commit | Author | Date | Subject | URL');
    expect(result).toContain(
      '1 | abcdef1 | Alice <alice@example.com> | 2024-01-01T00:00:00.000Z | Initial commit | https://example.com/commit/abcdef1'
    );
    expect(result).toContain(
      '2 | abcdef1 | Alice <alice@example.com> | 2024-01-01T00:00:00.000Z | Initial commit | https://example.com/commit/abcdef1'
    );
    expect(result).toContain(
      '3 | fedcba0987654321fedcba0987654321fedcba09 | bob@example.com <bob@example.com> | 2024-01-02T12:34:56.000Z | No subject | No URL'
    );

    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });
  });

  it('returns revision not found message when commit is missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toBe('Revision main not found in github.com/test/repo.');
  });

  it('returns file not found message when blob is missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: null,
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/missing.ts',
      rev: 'main',
    });

    expect(result).toBe('File src/missing.ts not found at main in github.com/test/repo.');
  });

  it('returns repository not found message when repository is missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: null,
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Repository github.com/test/repo not found.');
  });

  it('returns informative message when blame ranges are empty', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'src/index.ts',
              blame: [],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'main',
    });

    expect(result).toContain('No blame information available for the requested range.');
  });

  it('fills in placeholders when author and commit metadata are missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'src/index.ts',
              blame: [
                {
                  startLine: 4,
                  endLine: 4,
                  author: null,
                  commit: null,
                },
              ],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toContain('4 | unknown | Unknown author | Unknown date | No subject | No URL');
  });

  it('retains original value when author date cannot be parsed', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'src/index.ts',
              blame: [
                {
                  startLine: 5,
                  endLine: 5,
                  author: {
                    date: 'not-a-date',
                    person: null,
                  },
                  commit: {
                    oid: '1234567890abcdef1234567890abcdef12345678',
                    abbreviatedOID: '1234567',
                    url: 'https://example.com/commit/1234567',
                    subject: 'Refactor module',
                  },
                },
              ],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toContain(
      '5 | 1234567 | Unknown author | not-a-date | Refactor module | https://example.com/commit/1234567'
    );
  });

  it('skips invalid ranges and surfaces a helpful message', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/test/repo',
          url: '/github.com/test/repo',
          commit: {
            oid: 'abcdef',
            blob: {
              path: 'src/index.ts',
              blame: [
                {
                  startLine: Number.NaN,
                  endLine: Number.NaN,
                  author: null,
                  commit: null,
                },
              ],
            },
          },
        },
      }),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toContain('Line | Commit | Author | Date | Subject | URL');
    expect(result).toContain('No blame information available for the requested range.');
  });

  it('returns an error message when the API request fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Error retrieving blame information: Network error');
  });

  it('serializes non-error throwables when retrieving blame fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('catastrophic failure'),
    } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
    });

    expect(result).toBe('Error retrieving blame information: catastrophic failure');
  });

  it('validates line range ordering before querying', async () => {
    const queryMock = vi.fn();
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    const result = await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      startLine: 10,
      endLine: 5,
    });

    expect(result).toBe('Invalid blame range: startLine must be less than or equal to endLine.');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('forwards valid start and end line parameters to the API', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/test/repo',
        url: '/github.com/test/repo',
        commit: {
          oid: 'abcdef',
          blob: {
            path: 'src/index.ts',
            blame: [
              {
                startLine: 5,
                endLine: 5,
                author: {
                  date: '2024-01-01T00:00:00Z',
                  person: {
                    displayName: 'Alice',
                    email: 'alice@example.com',
                  },
                },
                commit: {
                  oid: 'abcdef',
                  abbreviatedOID: 'abcdef',
                  url: 'https://example.com/commit/abcdef',
                  subject: 'Feature work',
                },
              },
            ],
          },
        },
      },
    });
    const mockClient = { query: queryMock } as unknown as SourcegraphClient;

    await fileBlame(mockClient, {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      startLine: 5,
      endLine: 10,
    });

    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {
      repo: 'github.com/test/repo',
      path: 'src/index.ts',
      rev: 'HEAD',
      startLine: 5,
      endLine: 10,
    });
  });
});
