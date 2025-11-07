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
