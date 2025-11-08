/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { vi } from 'vitest';
import type { SourcegraphClient } from '../src/graphql/client.js';
import {
  SEARCH_QUERY,
  COMMIT_SEARCH_QUERY,
  CODE_SEARCH_QUERY,
  SYMBOL_SEARCH_QUERY,
} from '../src/graphql/queries/search.js';
import { REPO_QUERY } from '../src/graphql/queries/repos.js';
import { FILE_QUERY } from '../src/graphql/queries/file.js';
import { FILE_TREE_QUERY } from '../src/graphql/queries/file-tree.js';
import { BLAME_QUERY } from '../src/graphql/queries/blame.js';
import { CONNECTION_QUERY } from '../src/graphql/queries/connection.js';
import { USER_QUERY } from '../src/graphql/queries/user.js';

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

// Advanced mock builders for edge cases and scenarios
export const createMockRepositoryWithScenarios = () => ({
  // Standard repository
  standard: createMockRepository(),

  // Private repository
  private: createMockRepository({ isPrivate: true }),

  // Forked repository
  forked: createMockRepository({ isFork: true }),

  // Archived repository
  archived: createMockRepository({ isArchived: true }),

  // Repository with no description
  noDescription: createMockRepository({ description: '' }),

  // Repository with very long description
  longDescription: createMockRepository({
    description: `${'A'.repeat(500)} very long repository description that exceeds normal limits and tests edge cases for text handling.`,
  }),

  // Repository with Unicode characters
  unicode: createMockRepository({
    name: 'github.com/tëst/répôt',
    description: 'Repository with Unicode: àáâãäå, 🌍, 世界',
  }),

  // Repository with special characters
  specialChars: createMockRepository({
    name: 'github.com/test-repo_special.chars',
    description:
      'Description with <script>alert("xss")</script> and other special chars: @#$%^&*()',
  }),

  // Repository with missing fields
  incomplete: {
    name: 'github.com/incomplete/repo',
    url: 'https://sourcegraph.com/github.com/incomplete/repo',
    isPrivate: false,
    isFork: false,
    isArchived: false,
    mirrorInfo: null,
    defaultBranch: null,
    viewerCanAdminister: false,
    updatedAt: null,
  },

  // Repository with extreme values
  extreme: createMockRepository({
    name: 'a'.repeat(200), // Very long repo name
    description: 'z'.repeat(1000), // Very long description
  }),
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

// Advanced file mock builders for edge cases
export const createMockFileWithScenarios = () => ({
  // Standard file
  standard: createMockFile(),

  // Binary file
  binary: createMockBinaryFile(),

  // Large file
  large: createMockLargeFile(),

  // Empty file
  empty: createMockEmptyFile(),

  // File with special characters in path
  specialPath: createMockFile({
    path: 'src/file with spaces & special-chars_(test).js',
    content: 'console.log("special file");',
    byteSize: 30,
  }),

  // File with Unicode content
  unicode: createMockFile({
    path: 'src/unicode.js',
    content: 'console.log("Hello 世界 🌍 àáâãäå");',
    byteSize: 40,
  }),

  // Very large file (simulate memory issues)
  veryLarge: createMockFile({
    path: 'huge-file.dat',
    content: 'x'.repeat(100000), // 100KB file
    byteSize: 100000,
  }),

  // File with null content (edge case)
  nullContent: createMockFile({
    content: null,
    byteSize: 100,
    isBinary: false,
  }),

  // File with highlighting aborted
  highlightAborted: createMockFile({
    highlight: { aborted: true },
  }),

  // File with extremely long path
  longPath: createMockFile({
    path: 'very/deep/nested/directory/structure/with/a/file/name/that/is/extremely/long/and/might/cause/issues/with/path/handling/length/limits/test.js',
    content: 'console.log("deep file");',
    byteSize: 25,
  }),
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

// Advanced search result mock builders for edge cases
export const createMockSearchResultsWithScenarios = () => ({
  // Standard search results
  standard: createMockSearchResults(),

  // No results
  empty: createMockSearchResults({
    results: {
      results: [],
      matchCount: 0,
      limitHit: false,
    },
  }),

  // Limit hit
  limitHit: createMockSearchResults({
    results: {
      results: Array.from({ length: 100 }, () => createMockFileMatch()),
      matchCount: 1000,
      limitHit: true,
    },
  }),

  // Cloning repositories
  cloning: createMockSearchResults({
    results: {
      results: [],
      matchCount: 0,
      limitHit: false,
      cloning: [{ name: 'repo1' }, { name: 'repo2' }, { name: 'repo3' }],
    },
  }),

  // Timed out repositories
  timedOut: createMockSearchResults({
    results: {
      results: [],
      matchCount: 0,
      limitHit: false,
      timedout: [{ name: 'slow-repo-1' }, { name: 'slow-repo-2' }],
    },
  }),

  // Mixed results (FileMatch and CommitMatch)
  mixed: createMockSearchResults({
    results: {
      results: [
        createMockFileMatch(),
        {
          __typename: 'CommitMatch',
          commit: createMockCommit(),
          repository: {
            name: 'github.com/test/repo',
            url: '/github.com/test/repo',
          },
        },
      ],
      matchCount: 2,
      limitHit: false,
    },
  }),

  // Results with Unicode content
  unicode: createMockSearchResults({
    results: {
      results: [
        createMockFileMatch({
          file: { path: 'src/unicode.js' },
          lineMatches: [
            {
              lineNumber: 1,
              offsetAndLengths: [[0, 10]],
              preview: 'console.log("世界 🌍");',
            },
          ],
        }),
      ],
      matchCount: 1,
      limitHit: false,
    },
  }),

  // Very large result set
  large: createMockSearchResults({
    results: {
      results: Array.from({ length: 1000 }, (_, i) =>
        createMockFileMatch({
          file: { path: `file-${i}.ts` },
        }),
      ),
      matchCount: 5000,
      limitHit: true,
    },
  }),

  // Results without line matches
  noLineMatches: createMockSearchResults({
    results: {
      results: [
        createMockFileMatch({
          lineMatches: [],
        }),
      ],
      matchCount: 1,
      limitHit: false,
    },
  }),
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

// Mock creation helpers
export const createMockClientWithResponse = (response: any) => ({
  query: vi.fn().mockResolvedValue(response),
});

export const createMockClientWithError = (error: any) => ({
  query: vi.fn().mockRejectedValue(error),
});

// Error testing helpers
export const testErrorHandling = async (
  toolFunction: (client: any, params: any) => Promise<string>,
  params: any,
  errorScenarios: Array<{ error: any; expectedMessage: string }>,
) => {
  describe('Error Handling', () => {
    it.each(errorScenarios)(
      'should handle $error gracefully',
      async ({ error, expectedMessage }) => {
        const mockClient = createMockClientWithError(error);
        const result = await toolFunction(mockClient, params);
        expect(result).toContain(expectedMessage);
      },
    );
  });
};

// Test fixtures and setup helpers
export const setupMockClient = (response?: any) => {
  const queryMock = vi.fn();
  if (response !== undefined) {
    queryMock.mockResolvedValue(response);
  }
  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
  };
};

export const createTestSetup = () => {
  const { mockClient, queryMock } = setupMockClient();
  return {
    mockClient,
    queryMock,
    resetMocks: () => {
      queryMock.mockClear();
    },
  };
};

// Mock verification helpers
export const createVerifiedMockClient = (expectedQuery: string, response?: any) => {
  const queryMock = vi.fn().mockImplementation(async (query) => {
    // Verify the correct GraphQL query is being used
    if (query !== expectedQuery) {
      throw new Error(`Expected query:\n${expectedQuery}\n\nActual query:\n${query}`);
    }
    return response !== undefined ? Promise.resolve(response) : Promise.resolve({});
  });

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    verifyCalledWith: (expectedVariables?: any) => {
      if (expectedVariables) {
        expect(queryMock).toHaveBeenCalledWith(expectedQuery, expectedVariables);
      } else {
        expect(queryMock).toHaveBeenCalledWith(expectedQuery, expect.any(Object));
      }
    },
  };
};

// Network simulation helpers
export const createDelayMockClient = (response: any, delayMs: number) => {
  const queryMock = vi.fn().mockImplementation(
    async () =>
      new Promise((resolve) =>
        setTimeout(() => {
          resolve(response);
        }, delayMs),
      ),
  );
  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
  };
};

export const createIntermittentFailureMockClient = (
  response: any,
  failureRate = 0.3, // 30% failure rate
  failureError: Error = new Error('Network error'),
) => {
  const queryMock = vi.fn().mockImplementation(async () => {
    if (Math.random() < failureRate) {
      return Promise.reject(failureError);
    }
    return Promise.resolve(response);
  });

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    getFailureRate: () => failureRate,
    getCallStats: () => ({
      total: queryMock.mock.calls.length,
      failures: queryMock.mock.results.filter((r) => r.type === 'throw').length,
    }),
  };
};

export const createProgressiveDelayMockClient = (
  response: any,
  initialDelayMs = 100,
  delayIncrementMs = 200,
  maxDelayMs = 5000,
) => {
  let currentDelay = initialDelayMs;

  const queryMock = vi.fn().mockImplementation(async () => {
    const delay = currentDelay;
    currentDelay = Math.min(currentDelay + delayIncrementMs, maxDelayMs);
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve(response);
      }, delay),
    );
  });

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    resetDelay: () => {
      currentDelay = initialDelayMs;
    },
    getCurrentDelay: () => currentDelay,
  };
};

export const createTimeoutMockClient = (timeoutMs = 30000) => {
  const queryMock = vi.fn().mockImplementation(
    async () =>
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, timeoutMs),
      ),
  );

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    timeoutMs,
  };
};

export const createNetworkErrorMockClient = (
  errorType: 'timeout' | 'connection' | 'dns' | 'ssl' = 'connection',
) => {
  const errorMessages = {
    timeout: 'Request timeout',
    connection: 'Connection refused',
    dns: 'DNS resolution failed',
    ssl: 'SSL certificate error',
  };

  const queryMock = vi.fn().mockRejectedValue(new Error(errorMessages[errorType]));

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    errorType,
  };
};

// Rate limiting simulation
export const createRateLimitedMockClient = (
  response: any,
  rateLimitWindowMs = 60000, // 1 minute
  maxRequests = 100,
) => {
  let requestCount = 0;
  let windowStart = Date.now();

  const queryMock = vi.fn().mockImplementation(async () => {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - windowStart > rateLimitWindowMs) {
      requestCount = 0;
      windowStart = now;
    }

    requestCount++;

    if (requestCount > maxRequests) {
      return Promise.reject(new Error('Rate limit exceeded'));
    }

    return Promise.resolve(response);
  });

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    getRequestCount: () => requestCount,
    resetRateLimit: () => {
      requestCount = 0;
      windowStart = Date.now();
    },
  };
};

// Mock state management for complex scenarios
export class MockStateManager {
  private callHistory: Array<{ query: string; variables: any; response: any; timestamp: number }> =
    [];
  private readonly currentState = new Map<string, any>();
  private expectations: Array<{ query?: string; variables?: any; response: any }> = [];

  addCall(query: string, variables: any, response: any) {
    this.callHistory.push({
      query,
      variables,
      response,
      timestamp: Date.now(),
    });
  }

  getCallHistory() {
    return this.callHistory;
  }

  getCallsByQuery(query: string) {
    return this.callHistory.filter((call) => call.query === query);
  }

  getLastCall() {
    return this.callHistory[this.callHistory.length - 1];
  }

  getCallCount(query?: string) {
    if (query) {
      return this.getCallsByQuery(query).length;
    }
    return this.callHistory.length;
  }

  setState(key: string, value: any) {
    this.currentState.set(key, value);
  }

  getState(key: string) {
    return this.currentState.get(key);
  }

  updateState(key: string, updater: (current: any) => any) {
    const current = this.getState(key);
    this.setState(key, updater(current));
  }

  expectCall(query?: string, variables?: any, response?: any) {
    this.expectations.push({ query, variables, response });
  }

  verifyExpectations() {
    for (const expectation of this.expectations) {
      const matchingCalls = this.callHistory.filter((call) => {
        if (expectation.query && call.query !== expectation.query) {
          return false;
        }
        if (
          expectation.variables &&
          JSON.stringify(call.variables) !== JSON.stringify(expectation.variables)
        ) {
          return false;
        }
        return true;
      });

      if (matchingCalls.length === 0) {
        throw new Error(`Expected call not found: ${JSON.stringify(expectation)}`);
      }
    }
  }

  reset() {
    this.callHistory = [];
    this.currentState.clear();
    this.expectations = [];
  }
}

// Validation helpers to prevent test data drift
export const validateMockDataIntegrity = (mockData: any, schema: any) => {
  // Basic validation that required fields exist
  const validateObject = (obj: any, schemaObj: any, path = '') => {
    for (const [key, validator] of Object.entries(schemaObj)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (typeof validator === 'string') {
        // Type check
        if (typeof obj[key] !== validator) {
          throw new Error(
            `Type mismatch at ${fullPath}: expected ${validator}, got ${typeof obj[key]}`,
          );
        }
      } else if (typeof validator === 'function') {
        // Custom validator function
        if (!validator(obj[key])) {
          throw new Error(`Validation failed at ${fullPath}`);
        }
      } else if (typeof validator === 'object') {
        // Nested object
        if (obj[key] && typeof obj[key] === 'object') {
          validateObject(obj[key], validator, fullPath);
        }
      }
    }
  };

  validateObject(mockData, schema);
};

export const createMockDataValidator = (schema: any) => (data: any) => {
  validateMockDataIntegrity(data, schema);
};

// Pre-defined validation schemas for common mock data
export const MOCK_DATA_SCHEMAS = {
  repository: {
    name: 'string',
    description: 'string',
    url: 'string',
    isPrivate: 'boolean',
    isFork: 'boolean',
    isArchived: 'boolean',
    viewerCanAdminister: 'boolean',
    mirrorInfo: {
      cloned: 'boolean',
      cloneInProgress: 'boolean',
      cloneProgress: (value: any) => typeof value === 'string' || value === null,
    },
    defaultBranch: (value: any) => !value || (typeof value === 'object' && value.displayName),
    updatedAt: 'string',
  },

  file: {
    path: 'string',
    content: (value: any) => typeof value === 'string' || value === null,
    byteSize: 'number',
    isBinary: 'boolean',
    highlight: {
      aborted: 'boolean',
    },
  },

  commit: {
    oid: 'string',
    abbreviatedOID: 'string',
    subject: 'string',
    author: {
      person: {
        displayName: 'string',
        email: 'string',
      },
      date: 'string',
    },
    url: 'string',
  },

  searchResult: {
    results: {
      results: 'object', // Array of result objects
      matchCount: 'number',
      limitHit: 'boolean',
      cloning: 'object', // Array or empty array
      timedout: 'object', // Array or empty array
    },
  },

  user: {
    username: 'string',
    email: 'string',
    displayName: 'string',
    organizations: {
      nodes: 'object', // Array of organization objects
    },
  },
};

// Validation helpers with pre-defined schemas
export const validateMockRepository = (repo: any) => {
  validateMockDataIntegrity(repo, MOCK_DATA_SCHEMAS.repository);
};

export const validateMockFile = (file: any) => {
  validateMockDataIntegrity(file, MOCK_DATA_SCHEMAS.file);
};

export const validateMockCommit = (commit: any) => {
  validateMockDataIntegrity(commit, MOCK_DATA_SCHEMAS.commit);
};

export const validateMockSearchResult = (result: any) => {
  validateMockDataIntegrity(result, MOCK_DATA_SCHEMAS.searchResult);
};

export const validateMockUser = (user: any) => {
  validateMockDataIntegrity(user, MOCK_DATA_SCHEMAS.user);
};

// Batch validation for multiple mock objects
export const validateMockBatch = (
  mocks: Array<{ data: any; type: keyof typeof MOCK_DATA_SCHEMAS }>,
) => {
  const errors: Array<{ index: number; error: string }> = [];

  mocks.forEach((mock, index) => {
    try {
      validateMockDataIntegrity(mock.data, MOCK_DATA_SCHEMAS[mock.type]);
    } catch (error) {
      errors.push({ index, error: error.message });
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Mock data validation failed:\n${errors.map((e) => `  [${e.index}]: ${e.error}`).join('\n')}`,
    );
  }
};

// Mock data consistency checker
export class MockDataConsistencyChecker {
  private readonly baselineData = new Map<string, any>();

  setBaseline(key: string, data: any) {
    this.baselineData.set(key, JSON.parse(JSON.stringify(data))); // Deep clone
  }

  checkConsistency(key: string, currentData: any, ignoreFields: string[] = []) {
    const baseline = this.baselineData.get(key);
    if (!baseline) {
      throw new Error(`No baseline data found for key: ${key}`);
    }

    const differences = this.findDifferences(baseline, currentData, ignoreFields);
    if (differences.length > 0) {
      throw new Error(`Mock data inconsistency for ${key}:\n${differences.join('\n')}`);
    }
  }

  private findDifferences(obj1: any, obj2: any, ignoreFields: string[], path = ''): string[] {
    const differences: string[] = [];

    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of keys) {
      if (ignoreFields.includes(key)) {
        continue;
      }

      const fullPath = path ? `${path}.${key}` : key;
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (val1 === undefined && val2 !== undefined) {
        differences.push(`  + ${fullPath}: ${JSON.stringify(val2)} (added)`);
      } else if (val1 !== undefined && val2 === undefined) {
        differences.push(`  - ${fullPath}: ${JSON.stringify(val1)} (removed)`);
      } else if (typeof val1 !== typeof val2) {
        differences.push(`  ≠ ${fullPath}: ${typeof val1} → ${typeof val2}`);
      } else if (typeof val1 === 'object' && val1 !== null) {
        differences.push(...this.findDifferences(val1, val2, ignoreFields, fullPath));
      } else if (val1 !== val2) {
        differences.push(`  ≠ ${fullPath}: ${JSON.stringify(val1)} → ${JSON.stringify(val2)}`);
      }
    }

    return differences;
  }
}

export const createStatefulMockClient = (stateManager: MockStateManager, defaultResponse?: any) => {
  const queryMock = vi.fn().mockImplementation(async (query, variables) => {
    stateManager.addCall(query, variables, defaultResponse);
    return Promise.resolve(defaultResponse);
  });

  return {
    query: queryMock,
    mockClient: { query: queryMock } as unknown as SourcegraphClient,
    queryMock,
    stateManager,
  };
};

// Convenience functions for verified mock clients
export const createSearchMockClient = (response?: any) =>
  createVerifiedMockClient(SEARCH_QUERY, response);

export const createCodeSearchMockClient = (response?: any) =>
  createVerifiedMockClient(CODE_SEARCH_QUERY, response);

export const createCommitSearchMockClient = (response?: any) =>
  createVerifiedMockClient(COMMIT_SEARCH_QUERY, response);

export const createSymbolSearchMockClient = (response?: any) =>
  createVerifiedMockClient(SYMBOL_SEARCH_QUERY, response);

export const createRepoMockClient = (response?: any) =>
  createVerifiedMockClient(REPO_QUERY, response);

export const createFileMockClient = (response?: any) =>
  createVerifiedMockClient(FILE_QUERY, response);

export const createFileTreeMockClient = (response?: any) =>
  createVerifiedMockClient(FILE_TREE_QUERY, response);

export const createBlameMockClient = (response?: any) =>
  createVerifiedMockClient(BLAME_QUERY, response);

export const createConnectionMockClient = (response?: any) =>
  createVerifiedMockClient(CONNECTION_QUERY, response);

export const createUserMockClient = (response?: any) =>
  createVerifiedMockClient(USER_QUERY, response);

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
