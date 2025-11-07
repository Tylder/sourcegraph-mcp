/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { SourcegraphClient } from '../src/graphql/client.js';

/**
 * Test utilities for creating consistent mock data across tests
 */

// Repository mock data factories
export interface MockRepository {
  name: string;
  description: string;
  url: string;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  viewerCanAdminister: boolean;
  mirrorInfo: {
    cloned: boolean;
    cloneInProgress: boolean;
    cloneProgress: string | null;
  };
  defaultBranch: {
    displayName: string;
  };
  updatedAt: string;
}

export const createMockRepository = (overrides: Partial<MockRepository> = {}): MockRepository => ({
  name: 'github.com/test/repo',
  description: 'Test repository',
  url: 'https://sourcegraph.com/github.com/test/repo',
  isPrivate: false,
  isFork: false,
  isArchived: false,
  viewerCanAdminister: true,
  mirrorInfo: {
    cloned: true,
    cloneInProgress: false,
    cloneProgress: null,
  },
  defaultBranch: {
    displayName: 'main',
  },
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockPrivateRepository = () =>
  createMockRepository({
    isPrivate: true,
    viewerCanAdminister: false,
  });

export const createMockForkRepository = () =>
  createMockRepository({
    isFork: true,
    name: 'github.com/user/forked-repo',
    url: 'https://sourcegraph.com/github.com/user/forked-repo',
  });

export const createMockArchivedRepository = () =>
  createMockRepository({
    isArchived: true,
  });

export const createMockCloningRepository = () =>
  createMockRepository({
    mirrorInfo: {
      cloned: false,
      cloneInProgress: true,
      cloneProgress: '45%',
    },
  });

// File mock data factories
export interface MockFile {
  path: string;
  content: string;
  byteSize: number;
  isBinary: boolean;
  highlight: {
    aborted: boolean;
  };
}

export const createMockFile = (overrides: Partial<MockFile> = {}): MockFile => ({
  path: 'src/index.ts',
  content: 'console.log("Hello, World!");\n',
  byteSize: 28,
  isBinary: false,
  highlight: {
    aborted: false,
  },
  ...overrides,
});

export const createMockBinaryFile = () =>
  createMockFile({
    path: 'bin/app',
    content: null,
    byteSize: 1024,
    isBinary: true,
  });

export const createMockLargeFile = () =>
  createMockFile({
    path: 'large-file.txt',
    content: 'x'.repeat(10000),
    byteSize: 10000,
  });

export const createMockEmptyFile = () =>
  createMockFile({
    path: 'empty.txt',
    content: '',
    byteSize: 0,
  });

// Commit mock data factories
export const createMockCommit = (overrides: Partial<any> = {}) => ({
  oid: 'abcdef1234567890abcdef1234567890abcdef12',
  abbreviatedOID: 'abcdef1',
  subject: 'Add awesome feature',
  author: {
    person: {
      displayName: 'Alice Developer',
      email: 'alice@example.com',
    },
    date: '2024-01-15T10:30:00Z',
  },
  url: 'https://sourcegraph.com/github.com/test/repo@abcdef1',
  ...overrides,
});

export const createMockCommitWithLongMessage = () =>
  createMockCommit({
    subject:
      'This is a very long commit message that exceeds normal length and contains detailed information about the changes made to the codebase including multiple lines of description',
  });

export const createMockCommitWithSpecialChars = () =>
  createMockCommit({
    subject: 'Fix: Handle spécial chärs in filenames (test_文件.js)',
    author: {
      person: {
        displayName: 'José María González',
        email: 'jose.maria@example.com',
      },
      date: '2024-01-15T10:30:00Z',
    },
  });

// Branch mock data factories
export const createMockBranch = (overrides: Partial<any> = {}) => ({
  name: 'refs/heads/main',
  displayName: 'main',
  abbreviatedName: 'main',
  url: 'https://sourcegraph.com/github.com/test/repo@main',
  target: {
    abbreviatedOID: 'abcdef1',
  },
  ...overrides,
});

export const createMockBranches = (count = 3) => ({
  nodes: Array.from({ length: count }, (_, i) =>
    createMockBranch({
      name: `refs/heads/branch-${i.toString()}`,
      displayName: `branch-${i.toString()}`,
      url: `https://sourcegraph.com/github.com/test/repo@branch-${i.toString()}`,
      target: {
        abbreviatedOID: `abc${i.toString()}def`,
      },
    }),
  ),
  pageInfo: {
    hasNextPage: count > 10,
    endCursor: count > 10 ? 'next-cursor' : null,
  },
});

// Search result mock data factories
export const createMockFileMatch = (overrides: Partial<any> = {}) => ({
  __typename: 'FileMatch',
  file: {
    path: 'src/utils.ts',
    url: '/github.com/test/repo/-/blob/src/utils.ts',
  },
  repository: {
    name: 'github.com/test/repo',
    url: '/github.com/test/repo',
  },
  lineMatches: [
    {
      lineNumber: 42,
      offsetAndLengths: [[0, 10]],
      preview: 'function helper() {',
    },
  ],
  ...overrides,
});

export const createMockSearchResults = (overrides: Partial<any> = {}) => ({
  results: {
    results: [createMockFileMatch()],
    matchCount: 1,
    limitHit: false,
    cloning: [],
    timedout: [],
    ...overrides.results,
  },
  ...overrides,
});

// User mock data factories
export const createMockUser = (overrides: Partial<any> = {}) => ({
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  organizations: {
    nodes: [
      {
        name: 'test-org',
        displayName: 'Test Organization',
      },
    ],
  },
  ...overrides,
});

// GraphQL response factories
export const createMockQueryResponse = (data: any) => ({
  query: vi.fn().mockResolvedValue(data),
});

// Mock client factory
export const createMockClient = (response: any = {}) => {
  const client = {
    query: vi.fn().mockResolvedValue(response),
  };

  return client as unknown as SourcegraphClient;
};

// Validation helpers
export const expectValidRepositoryResponse = (result: string, repoName: string): void => {
  expect(result).toContain(`Repository: ${repoName}`);
  expect(result).toContain('Description:');
  expect(result).toContain('Default Branch:');
  expect(result).toContain('Clone Status:');
};

export const expectValidFileResponse = (result: string, filePath: string): void => {
  expect(result).toContain('Repository:');
  expect(result).toContain(`Path: ${filePath}`);
  expect(result).toContain('Revision Requested:');
  expect(result).toContain('Size:');
};

// Schema validation helpers
export interface RepositoryResponseSchema {
  repository: string;
  url: string;
  description: string;
  defaultBranch: string;
  visibility: string;
  fork: string;
  archived: string;
  cloneStatus: string;
  stats?: string[];
}

export const validateRepositoryResponseSchema = (result: string): RepositoryResponseSchema => {
  const lines = result.split('\n');

  // Basic structure validation
  expect(lines.length).toBeGreaterThanOrEqual(8);
  expect(lines[0]).toMatch(/^Repository: /);
  expect(lines[1]).toMatch(/^URL: /);
  expect(lines[2]).toMatch(/^Description: /);
  expect(lines[3]).toMatch(/^Default Branch: /);
  expect(lines[4]).toMatch(/^Visibility: /);
  expect(lines[5]).toMatch(/^Fork: /);
  expect(lines[6]).toMatch(/^Archived: /);
  expect(lines[7]).toMatch(/^Clone Status: /);

  const schema: RepositoryResponseSchema = {
    repository: lines[0].replace('Repository: ', ''),
    url: lines[1].replace('URL: ', ''),
    description: lines[2].replace('Description: ', ''),
    defaultBranch: lines[3].replace('Default Branch: ', ''),
    visibility: lines[4].replace('Visibility: ', ''),
    fork: lines[5].replace('Fork: ', ''),
    archived: lines[6].replace('Archived: ', ''),
    cloneStatus: lines[7].replace('Clone Status: ', ''),
  };

  // Check for stats section
  if (lines.length > 9 && lines[9] === 'Repository Stats:') {
    schema.stats = [];
    for (let i = 10; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('- ')) {
        schema.stats.push(line.substring(2));
      }
    }
  }

  return schema;
};

export interface FileResponseSchema {
  repository: string;
  repositoryUrl: string;
  path: string;
  revisionRequested: string;
  revisionOid: string;
  size: string;
  content?: string;
  warning?: string;
}

export const validateFileResponseSchema = (result: string): FileResponseSchema => {
  const lines = result.split('\n');

  // Basic structure validation
  expect(lines.length).toBeGreaterThanOrEqual(6);
  expect(lines[0]).toMatch(/^Repository: /);
  expect(lines[1]).toMatch(/^Repository URL: /);
  expect(lines[2]).toMatch(/^Path: /);
  expect(lines[3]).toMatch(/^Revision Requested: /);
  expect(lines[4]).toMatch(/^Revision OID: /);
  expect(lines[5]).toMatch(/^Size: /);

  const schema: FileResponseSchema = {
    repository: lines[0].replace('Repository: ', ''),
    repositoryUrl: lines[1].replace('Repository URL: ', ''),
    path: lines[2].replace('Path: ', ''),
    revisionRequested: lines[3].replace('Revision Requested: ', ''),
    revisionOid: lines[4].replace('Revision OID: ', ''),
    size: lines[5].replace('Size: ', ''),
  };

  // Check for content or warning
  if (lines.length > 7) {
    if (lines[6] === 'Warning: Binary file content is not displayed.') {
      // eslint-disable-next-line @typescript-eslint/prefer-destructuring
      schema.warning = lines[6];
    } else if (lines[6] === '' && lines[7]) {
      // eslint-disable-next-line @typescript-eslint/prefer-destructuring
      schema.content = lines[7];
    }
  }

  return schema;
};

// Performance assertion helpers
export const expectResponseTime = async <T>(
  operation: () => Promise<T>,
  maxTimeMs = 1000,
): Promise<T> => {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(maxTimeMs);
  return result;
};
