import { describe, it, expect, vi } from 'vitest';
import { fileBlame } from '../../../../src/tools/files/blame.js';
import type { SourcegraphClient } from '../../../../src/graphql/client.js';

const REPO_NAME = 'github.com/test/repo';
const REPO_URL = '/github.com/test/repo';
const FILE_PATH = 'src/index.ts';
const FILE_URL = '/github.com/test/repo/-/blob/src/index.ts';
const COMMIT_OID = '1111111111111111111111111111111111111111';
const COMMIT_URL = '/github.com/test/repo/-/commit/1111111';

const DEFAULT_PARAMS = { repo: REPO_NAME, path: FILE_PATH } as const;

type MockAuthor = {
  person:
    | {
        displayName: string | null;
        name: string | null;
        email: string | null;
      }
    | null;
  date: string;
};
type MockCommit = { oid: string; abbreviatedOID: string; url: string; subject: string; author: MockAuthor };
type MockBlameHunk = { startLine: number; endLine: number; commit: MockCommit };
type RepositoryFile = { path: string; url: string; blame: MockBlameHunk[] | null };
type RepositoryCommit = { oid: string; url: string; file: RepositoryFile | null };
type RepositoryData = { name: string; url: string; commit: RepositoryCommit | null };
type QueryResult = { repository: RepositoryData | null };

function createBlameHunk(overrides: Partial<MockBlameHunk> = {}): MockBlameHunk {
  const hunk: MockBlameHunk = {
    startLine: 1,
    endLine: 1,
    commit: {
      oid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      abbreviatedOID: 'aaaaaaa',
      url: '/github.com/test/repo/-/commit/aaaaaaa',
      subject: 'Initial commit',
      author: {
        person: {
          displayName: 'Jane Doe',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        date: '2024-01-01T00:00:00Z',
      },
    },
  };

  if (overrides.startLine !== undefined) {
    hunk.startLine = overrides.startLine;
  }

  if (overrides.endLine !== undefined) {
    hunk.endLine = overrides.endLine;
  }

  if (overrides.commit) {
    const commitOverride = overrides.commit;
    const authorOverride = commitOverride.author;

    hunk.commit = {
      ...hunk.commit,
      ...commitOverride,
      author: hunk.commit.author,
    };

    if (authorOverride) {
      const baseAuthor = hunk.commit.author;
      const person = Object.prototype.hasOwnProperty.call(authorOverride, 'person')
        ? authorOverride.person ?? null
        : baseAuthor.person;

      hunk.commit.author = {
        ...baseAuthor,
        ...authorOverride,
        person,
      };
    }
  }

  return hunk;
}

const createFile = (): RepositoryFile => ({
  path: FILE_PATH,
  url: FILE_URL,
  blame: [createBlameHunk()],
});

const createCommit = (): RepositoryCommit => ({
  oid: COMMIT_OID,
  url: COMMIT_URL,
  file: createFile(),
});

const createRepository = (): RepositoryData => ({
  name: REPO_NAME,
  url: REPO_URL,
  commit: createCommit(),
});

interface QueryOptions {
  repository?: boolean;
  commit?: boolean;
  file?: boolean;
  blame?: RepositoryFile['blame'];
}

function createQueryResult(options: QueryOptions = {}): QueryResult {
  const { repository = true, commit = true, file = true, blame } = options;

  if (!repository) {
    return { repository: null };
  }

  const repositoryData = createRepository();

  if (!commit) {
    repositoryData.commit = null;
    return { repository: repositoryData };
  }

  if (!file) {
    repositoryData.commit.file = null;
    return { repository: repositoryData };
  }

  if (blame !== undefined) {
    repositoryData.commit.file = {
      ...repositoryData.commit.file!,
      blame,
    };
  }

  return { repository: repositoryData };
}

const createResolvedClient = (payload: QueryResult) => {
  const query = vi.fn().mockResolvedValue(payload);
  return { client: { query } as unknown as SourcegraphClient, query };
};

const createRejectedClient = (error: unknown) => {
  const query = vi.fn().mockRejectedValue(error);
  return { client: { query } as unknown as SourcegraphClient, query };
};

describe('fileBlame', () => {
  it('should format blame hunks correctly', async () => {
    const hunk = createBlameHunk({ endLine: 10 });
    const { client, query } = createResolvedClient(createQueryResult({ blame: [hunk] }));

    const result = await fileBlame(client, { ...DEFAULT_PARAMS, rev: 'main' });

    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        repo: REPO_NAME,
        path: FILE_PATH,
        rev: 'main',
      })
    );
    expect(result).toContain(`Repository: ${REPO_NAME}`);
    expect(result).toContain(`File: ${FILE_PATH}`);
    expect(result).toContain('Revision: main');
    expect(result).toContain('Hunk 1: Lines 1-10');
    expect(result).toContain('Commit: aaaaaaa (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
    expect(result).toContain('Subject: Initial commit');
    expect(result).toContain('Author: Jane Doe <jane@example.com>');
    expect(result).toContain('Date: 2024-01-01T00:00:00.000Z');
  });

  it.each([
    {
      description: 'repository',
      payload: () => createQueryResult({ repository: false }),
      expected: `Repository not found: ${REPO_NAME}`,
    },
    {
      description: 'file',
      payload: () => createQueryResult({ file: false }),
      expected: `File not found: ${FILE_PATH}`,
    },
  ])('should handle missing %s', async ({ payload, expected }) => {
    const { client } = createResolvedClient(payload());
    const result = await fileBlame(client, DEFAULT_PARAMS);
    expect(result).toBe(expected);
  });

  it('should handle missing commit for default and specific revisions', async () => {
    const { client } = createResolvedClient(createQueryResult({ commit: false }));

    const defaultBranch = await fileBlame(client, DEFAULT_PARAMS);
    expect(defaultBranch).toBe('Commit not found for revision default branch');

    const specificBranch = await fileBlame(client, { ...DEFAULT_PARAMS, rev: 'feature-branch' });
    expect(specificBranch).toBe('Commit not found for revision feature-branch');
  });

  it.each([
    { label: 'empty array', blame: [] as RepositoryFile['blame'] },
    { label: 'null value', blame: null as RepositoryFile['blame'] },
  ])('should handle %s blame hunks', async ({ blame }) => {
    const { client } = createResolvedClient(createQueryResult({ blame }));

    const result = await fileBlame(client, DEFAULT_PARAMS);

    expect(result).toBe(`No blame information available for ${FILE_PATH}`);
  });

  describe('author formatting', () => {
    const cases = [
      {
        description: 'without author information',
        author: { person: null, date: '2024-02-02T12:00:00Z' },
        expected: 'Author: Unknown author',
      },
      {
        description: 'with empty metadata fields',
        author: {
          person: { displayName: null, name: null, email: null },
          date: '2024-06-06T18:20:00Z',
        },
        expected: 'Author: Unknown author',
      },
      {
        description: 'falling back to the author name',
        author: {
          person: { displayName: null, name: 'Author Name', email: null },
          date: '2024-05-05T09:45:00Z',
        },
        expected: 'Author: Author Name',
      },
      {
        description: 'falling back to the email address',
        author: {
          person: { displayName: null, name: null, email: 'email-only@example.com' },
          date: '2024-03-03T15:30:00Z',
        },
        expected: 'Author: email-only@example.com <email-only@example.com>',
      },
      {
        description: 'omitting email details when missing',
        author: {
          person: { displayName: 'Author Without Email', name: null, email: null },
          date: '2024-04-04T10:00:00Z',
        },
        expected: 'Author: Author Without Email',
        assertNoEmailToken: true as const,
      },
    ] satisfies Array<{
      description: string;
      author: MockAuthor;
      expected: string;
      assertNoEmailToken?: true;
    }>;

    it.each(cases)('should format author output %s', async ({ author, expected, assertNoEmailToken }) => {
      const hunk = createBlameHunk({
        commit: {
          author,
        },
      });
      const { client } = createResolvedClient(createQueryResult({ blame: [hunk] }));

      const result = await fileBlame(client, DEFAULT_PARAMS);

      expect(result).toContain(expected);

      if (assertNoEmailToken) {
        expect(result).not.toContain('<');
      }
    });
  });

  it.each([
    {
      description: 'GraphQL errors',
      error: new Error('GraphQL error'),
      expected: 'Error retrieving file blame: GraphQL error',
    },
    {
      description: 'non-error rejections',
      error: 'network issue',
      expected: 'Error retrieving file blame: network issue',
    },
  ])('should handle %s gracefully', async ({ error, expected }) => {
    const { client } = createRejectedClient(error);
    const result = await fileBlame(client, DEFAULT_PARAMS);
    expect(result).toBe(expected);
  });
});
