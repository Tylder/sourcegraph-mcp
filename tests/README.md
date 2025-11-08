# Test Organization Guide

This document outlines the test organization, naming conventions, and best practices for the Sourcegraph MCP Server test suite.

## Test Categories

### Directory Structure

```
tests/
├── unit/                    # Unit tests (fast, isolated)
│   ├── search/             # Underlying search function tests
│   ├── files/              # File operation tests
│   ├── repos/              # Repository operation tests
│   ├── tools/              # MCP tool implementation tests
│   │   ├── search/         # Tool wrappers for search functions
│   │   ├── files/          # Tool wrappers for file operations
│   │   ├── repos/          # Tool wrappers for repo operations
│   │   └── util/           # Utility tool tests
│   ├── config.test.ts      # Configuration tests
│   ├── index.test.ts       # Main server tests
│   └── graphql-client.test.ts # GraphQL client tests
└── integration/            # Integration tests (slower, end-to-end)
    └── mcp-server.integration.test.ts
```

### Test File Naming Convention

- **Unit tests**: `{functionality}.test.ts`
- **Integration tests**: `{component}.integration.test.ts`
- **E2E tests**: `{feature}.e2e.test.ts` (future)

## Test Organization Patterns

### Nested Describe Blocks

Tests are organized with clear hierarchical structure:

```typescript
describe('ToolName', () => {
  describe('Basic Functionality', () => {
    // Core feature tests
  });

  describe('Error Handling', () => {
    // Error scenario tests
  });

  describe('Edge Cases', () => {
    // Boundary condition tests
  });
});
```

### Parameterized Tests

Use `it.each()` for repetitive test patterns:

```typescript
describe('Error Handling', () => {
  it.each([
    { error: new Error('Network timeout'), expected: 'timeout message' },
    { error: 'string error', expected: 'string error message' },
  ])('should handle $error gracefully', async ({ error, expected }) => {
    // Test implementation
  });
});
```

## Shared Utilities

### Mock Creation Helpers

```typescript
import { createMockClient, createMockRepository } from '../test-utils';

// Create consistent mock data
const mockRepo = createMockRepository({ isPrivate: true });
const mockClient = createMockClient({ repository: mockRepo });
```

## Verified Mock Clients

Use verified mock clients to ensure the correct GraphQL queries are executed:

```typescript
import { createCodeSearchMockClient, createRepoMockClient } from '../test-utils';

// Create a mock client that verifies the correct query is used
const { mockClient, verifyCalledWith } = createCodeSearchMockClient({
  search: { results: { results: [], matchCount: 0, limitHit: false } }
});

const result = await searchCode(mockClient, { query: 'test' });

// Verify the query was called with correct variables
verifyCalledWith({ query: 'test' });
```

### Available Verified Mock Clients

- `createSearchMockClient()` - General search queries
- `createCodeSearchMockClient()` - Code search queries
- `createCommitSearchMockClient()` - Commit search queries
- `createSymbolSearchMockClient()` - Symbol search queries
- `createRepoMockClient()` - Repository queries
- `createFileMockClient()` - File queries
- `createFileTreeMockClient()` - File tree queries
- `createBlameMockClient()` - Blame queries
- `createConnectionMockClient()` - Connection test queries
- `createUserMockClient()` - User queries

### Mock State Management

For complex multi-step scenarios, use the enhanced state manager:

```typescript
import { MockStateManager, createStatefulMockClient } from '../test-utils';

const stateManager = new MockStateManager();
const { mockClient } = createStatefulMockClient(stateManager, defaultResponse);

// Perform multiple operations...
await tool1(mockClient, params1);
await tool2(mockClient, params2);

// Verify call history and state
const history = stateManager.getCallHistory();
expect(history).toHaveLength(2);

const repoCalls = stateManager.getCallsByQuery('REPO_QUERY');
expect(repoCalls).toHaveLength(1);

const lastCall = stateManager.getLastCall();
expect(lastCall.timestamp).toBeGreaterThan(Date.now() - 1000);

// State management
stateManager.setState('lastRepo', 'github.com/test/repo');
stateManager.updateState('callCount', (count = 0) => count + 1);

expect(stateManager.getState('lastRepo')).toBe('github.com/test/repo');
expect(stateManager.getState('callCount')).toBe(1);
```

### Call Expectations

Set expectations for required calls and verify them:

```typescript
// Set expectations before operations
stateManager.expectCall('REPO_QUERY', { name: 'github.com/test/repo' });
stateManager.expectCall('FILE_QUERY', { repo: 'github.com/test/repo', path: 'src/index.ts' });

// Perform operations...
await repoInfo(mockClient, { name: 'github.com/test/repo' });
await fileGet(mockClient, { repo: 'github.com/test/repo', path: 'src/index.ts' });

// Verify all expected calls were made
stateManager.verifyExpectations();
```

### Mock Data Validation

Prevent test data drift with comprehensive validation:

#### Pre-defined Schema Validation
```typescript
import {
  validateMockRepository,
  validateMockFile,
  validateMockCommit,
  validateMockSearchResult,
  validateMockUser
} from '../test-utils';

// Validate using pre-defined schemas
const mockRepo = createMockRepository();
validateMockRepository(mockRepo); // Throws if invalid

const mockFile = createMockFile();
validateMockFile(mockFile);

const mockCommit = createMockCommit();
validateMockCommit(mockCommit);
```

#### Custom Schema Validation
```typescript
import { validateMockDataIntegrity, createMockDataValidator } from '../test-utils';

// Define custom validation schema
const customSchema = {
  name: 'string',
  description: 'string',
  isPrivate: 'boolean',
  mirrorInfo: {
    cloned: 'boolean',
    cloneInProgress: 'boolean'
  }
};

// Validate mock data
const mockRepo = createMockRepository();
validateMockDataIntegrity(mockRepo, customSchema); // Throws if invalid

// Or create a reusable validator
const validateRepo = createMockDataValidator(customSchema);
validateRepo(mockRepo); // Throws if invalid
```

#### Batch Validation
```typescript
import { validateMockBatch } from '../test-utils';

const mocks = [
  { data: createMockRepository(), type: 'repository' as const },
  { data: createMockFile(), type: 'file' as const },
  { data: createMockCommit(), type: 'commit' as const },
];

validateMockBatch(mocks); // Throws if any mock is invalid
```

#### Data Consistency Checking
```typescript
import { MockDataConsistencyChecker } from '../test-utils';

const checker = new MockDataConsistencyChecker();

// Set baseline data
const baselineRepo = createMockRepository();
checker.setBaseline('test-repo', baselineRepo);

// Later in tests, check consistency
const currentRepo = createMockRepository({ description: 'Changed description' });
checker.checkConsistency('test-repo', currentRepo); // Throws if inconsistent

// Ignore certain fields that are expected to change
checker.checkConsistency('test-repo', currentRepo, ['description']);
```

### Network Simulation

Test various network conditions and failure scenarios:

#### Delay Simulation
```typescript
import { createDelayMockClient } from '../test-utils';

const { mockClient } = createDelayMockClient(response, 2000); // 2 second delay
// This will timeout and trigger timeout error handling
```

#### Intermittent Failures
```typescript
import { createIntermittentFailureMockClient } from '../test-utils';

const { mockClient, getCallStats } = createIntermittentFailureMockClient(
  response,
  0.2, // 20% failure rate
  new Error('Network error')
);

// Run multiple requests to test resilience
for (let i = 0; i < 10; i++) {
  try {
    await makeRequest(mockClient);
  } catch (error) {
    // Handle intermittent failures
  }
}

const stats = getCallStats();
expect(stats.failures).toBeGreaterThan(0); // Should have some failures
```

#### Progressive Delays
```typescript
import { createProgressiveDelayMockClient } from '../test-utils';

const { mockClient, getCurrentDelay, resetDelay } = createProgressiveDelayMockClient(
  response,
  100,  // Initial delay: 100ms
  200,  // Delay increment: 200ms
  2000  // Max delay: 2 seconds
);

// First call: 100ms delay
await makeRequest(mockClient);
expect(getCurrentDelay()).toBe(300); // Next call will be 300ms

// Second call: 300ms delay
await makeRequest(mockClient);
expect(getCurrentDelay()).toBe(500); // Next call will be 500ms

resetDelay(); // Reset to initial delay
```

#### Network Errors
```typescript
import { createNetworkErrorMockClient, createTimeoutMockClient } from '../test-utils';

// Test different types of network errors
const timeoutClient = createTimeoutMockClient(5000); // 5 second timeout
const connectionClient = createNetworkErrorMockClient('connection');
const dnsClient = createNetworkErrorMockClient('dns');
const sslClient = createNetworkErrorMockClient('ssl');
```

#### Rate Limiting
```typescript
import { createRateLimitedMockClient } from '../test-utils';

const { mockClient, getRequestCount, resetRateLimit } = createRateLimitedMockClient(
  response,
  60000, // 1 minute window
  5      // Max 5 requests per minute
);

// Make requests up to the limit
for (let i = 0; i < 5; i++) {
  await makeRequest(mockClient); // Should succeed
}
expect(getRequestCount()).toBe(5);

// Next request should fail with rate limit error
await expect(makeRequest(mockClient)).rejects.toThrow('Rate limit exceeded');

resetRateLimit(); // Reset for next test
```

## Advanced Mock Builders

Use pre-configured mock scenarios for comprehensive testing:

```typescript
import {
  createMockRepositoryWithScenarios,
  createMockFileWithScenarios,
  createMockSearchResultsWithScenarios
} from '../test-utils';

// Test various repository scenarios
const repoScenarios = createMockRepositoryWithScenarios();
const privateRepo = repoScenarios.private;
const unicodeRepo = repoScenarios.unicode;
const extremeRepo = repoScenarios.extreme;

// Test various file scenarios
const fileScenarios = createMockFileWithScenarios();
const binaryFile = fileScenarios.binary;
const veryLargeFile = fileScenarios.veryLarge;
const unicodeFile = fileScenarios.unicode;

// Test various search result scenarios
const searchScenarios = createMockSearchResultsWithScenarios();
const emptyResults = searchScenarios.empty;
const limitHitResults = searchScenarios.limitHit;
const cloningResults = searchScenarios.cloning;
```

### Available Scenario Types

**Repository Scenarios:**
- `standard` - Basic repository
- `private` - Private repository
- `forked` - Forked repository
- `archived` - Archived repository
- `noDescription` - Repository without description
- `longDescription` - Repository with very long description
- `unicode` - Repository with Unicode characters
- `specialChars` - Repository with special characters
- `incomplete` - Repository with missing fields
- `extreme` - Repository with extreme values

**File Scenarios:**
- `standard` - Basic file
- `binary` - Binary file
- `large` - Large text file
- `empty` - Empty file
- `specialPath` - File with special characters in path
- `unicode` - File with Unicode content
- `veryLarge` - Very large file (100KB)
- `nullContent` - File with null content
- `highlightAborted` - File with highlighting aborted
- `longPath` - File with extremely long path

**Search Result Scenarios:**
- `standard` - Basic search results
- `empty` - No search results
- `limitHit` - Search limit exceeded
- `cloning` - Results with cloning repositories
- `timedOut` - Results with timed out repositories
- `mixed` - Mixed FileMatch and CommitMatch results
- `unicode` - Results with Unicode content
- `large` - Very large result set (1000+ results)
- `noLineMatches` - Results without line matches

### Error Testing Helper

```typescript
import { testErrorHandling } from '../test-utils';

testErrorHandling(
  myToolFunction,
  { param: 'value' },
  [
    { error: new Error('API error'), expectedMessage: 'Error: API error' },
    { error: 'string error', expectedMessage: 'Error: string error' },
  ]
);
```

### Performance Testing

```typescript
import { expectResponseTime } from '../test-utils';

const result = await expectResponseTime(
  () => myAsyncFunction(params),
  100 // Max 100ms
);
```

## Test Data Factories

Use shared factory functions for consistent test data:

- `createMockRepository(overrides?)` - Repository mock data
- `createMockFile(overrides?)` - File mock data
- `createMockCommit(overrides?)` - Commit mock data
- `createMockBranch(overrides?)` - Branch mock data

## Validation Helpers

Use schema validation for complex responses:

```typescript
import { validateRepositoryResponseSchema } from '../test-utils';

const result = await repoInfo(client, params);
const schema = validateRepositoryResponseSchema(result);
expect(schema.repository).toBe('expected/repo');
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach()` to reset state
- Mock external dependencies

### 2. Descriptive Test Names
- Use clear, descriptive test names
- Include expected behavior in the name
- Use parameterized test names effectively

### 3. Consistent Assertions
- Use schema validation for complex outputs
- Test exact output structure when important
- Use appropriate matchers (`toContain`, `toBe`, `toEqual`)

### 4. Performance Testing
- Include response time validation for user-facing functions
- Set reasonable timeouts (50-100ms for fast operations)

### 5. Error Coverage
- Test both `Error` objects and primitive error values
- Cover network errors, timeouts, and permission issues
- Verify user-friendly error messages

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Coverage report
npm run coverage

# Watch mode
npm run test:watch
```

## Coverage Goals

- **Statements**: 99.9% (target 100%)
- **Branches**: 99.78% (target 100%)
- **Functions**: 100%
- **Lines**: 99.9% (target 100%)

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Tagged releases

Coverage thresholds are enforced in CI.</content>
