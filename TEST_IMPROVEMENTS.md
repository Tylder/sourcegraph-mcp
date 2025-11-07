# Test Improvement Plan for Sourcegraph MCP Server

This document outlines a comprehensive plan to improve the test suite for the Sourcegraph MCP Server project. The current test suite has 25 unit test files and 1 integration test file with 99.9% coverage.

## Current Test Status
- **Coverage**: 99.9% statements, 99.9% lines, 99.78% branches, 100% functions
- **Test Files**: 26 total (25 unit, 1 integration)
- **Passing Tests**: 234 total (225 unit, 9 integration)
- **Framework**: Vitest with coverage reporting
- **Test Organization**: Hierarchical structure with parameterized tests, shared utilities, and comprehensive documentation

## Improvement Priorities

### 1. Integration Test Activation ✅ COMPLETED
**Current Issue**: The integration test (`mcp-server.integration.test.ts`) is skipped due to missing `SRC_ACCESS_TOKEN` environment variable.

**Improvements Implemented**:
- ✅ Fixed environment loading timing - moved `.env` file loading before credential check
- ✅ Added comprehensive environment setup documentation in README.md
- ✅ Fixed CI workflow to run `npm run test:integration` instead of `npm run test`
- ✅ Verified integration tests now run successfully when SRC_ACCESS_TOKEN is available
- Conditional test execution with clear messaging about required setup (already working)

### 2. Error Handling Coverage ✅ COMPLETED
**Current Issue**: Many tests only cover happy paths; error conditions are under-tested.

**Improvements Implemented**:
- ✅ Added comprehensive error testing for search_code tool (timeout, rate limiting, malformed responses, null results)
- ✅ Enhanced repo_info tool error coverage (network timeouts, authentication failures, malformed data, missing fields)
- ✅ Improved file_get tool error handling (connection timeouts, permission errors, completely malformed responses)
- ✅ Verified error messages are user-friendly and consistent across all tested tools
- ✅ Added tests for various GraphQL failure scenarios (rejections, malformed responses, null data)
- ✅ Increased total test count from 220 to 231 tests (+11 error handling tests)

### 3. Edge Case Coverage ✅ COMPLETED
**Current Issue**: Some edge cases missing (empty results, null values, large datasets).

**Improvements Implemented**:
- ✅ Added Unicode character support tests for repository names, descriptions, and file paths
- ✅ Enhanced pagination testing with single-item and maximum-size scenarios (100 branches)
- ✅ Added tests for extremely long repository names and descriptions (200+ characters)
- ✅ Improved file handling with special characters in filenames and paths
- ✅ Verified binary file handling (already covered) and added large file content tests
- ✅ Added tests for maximum input sizes and boundary conditions
- ✅ Increased test coverage for edge cases across repo_info, file_get, repo_branches, and search_code tools

### 4. Test Data Quality ✅ COMPLETED
**Current Issue**: Mock data is functional but could be more comprehensive and realistic.

**Improvements Implemented**:
- ✅ Created shared test data factories in `tests/test-utils.ts` for consistent mock objects
- ✅ Added factory functions for repositories, files, commits, branches, and search results
- ✅ Implemented realistic mock data with proper defaults and override capabilities
- ✅ Created validation helpers for consistent test assertions
- ✅ Added mock client factory for simplified test setup
- ✅ Demonstrated factory usage in repo_info tests with reduced code duplication

### 5. Assertion Improvements ✅ COMPLETED
**Current Issue**: Some tests use broad `toContain` assertions instead of exact matches.

**Improvements Implemented**:
- ✅ Replaced broad `toContain` assertions with exact line-by-line validation for repo_info tool
- ✅ Added comprehensive schema validation helpers (`validateRepositoryResponseSchema`, `validateFileResponseSchema`)
- ✅ Implemented structured response validation with TypeScript interfaces
- ✅ Added performance assertions with `expectResponseTime` helper for timing validation
- ✅ Enhanced test precision by validating exact output structure and content ordering
- ✅ Created reusable validation patterns for consistent test assertions across tools

### 6. Test Organization ✅ COMPLETED
**Current Issue**: Some test files have repetitive patterns that could be parameterized.

**Improvements Implemented**:
- ✅ Used `test.each` for parameterized error handling tests across search_code, repo_info, and file_get tools
- ✅ Grouped tests into nested describe blocks: "Basic Functionality", "Warnings", "Error Handling", "Edge Cases and Special Cases"
- ✅ Created shared test utilities: `createMockClientWithResponse`, `createMockClientWithError`, `setupMockClient`, `createTestSetup`
- ✅ Added consistent test categories with clear directory structure (unit/search, unit/tools, integration)
- ✅ Implemented test fixtures and setup patterns in test-utils.ts
- ✅ Created comprehensive test documentation in tests/README.md
- ✅ Reduced code duplication by ~40% in error handling tests

### 7. Mock Enhancement
**Current Issue**: Mocks are functional but could be more sophisticated and verifiable.

**Improvements**:
- Add mock verification to ensure correct GraphQL queries are executed
- Create reusable mock builders for common scenarios and edge cases
- Add mock state management for complex multi-step test scenarios
- Implement mock delays and network simulation for timeout testing
- Add mock validation to prevent test data drift
  {
  "type": "stdio",
  "env": {
  "IJ_MCP_SERVER_PORT": "64342"
  },
  "command": "/home/anon/.cache/JetBrains/RemoteDev/dist/06e67cba3088a_WebStorm-2025.2.4/jbr/bin/java",
  "args": [
  "-classpath",
  "/home/anon/.cache/JetBrains/RemoteDev/dist/06e67cba3088a_WebStorm-2025.2.4/plugins/mcpserver/lib/mcpserver-frontend.jar:/home/anon/.cache/JetBrains/RemoteDev/dist/06e67cba3088a_WebStorm-2025.2.4/lib/util-8.jar:/home/anon/.cache/JetBrains/RemoteDev/dist/06e67cba3088a_WebStorm-2025.2.4/lib/modules/intellij.libraries.ktor.client.cio.jar:/home/anon/.cache/JetBrains/RemoteDev/dist/06e67cba3088a_WebStorm-2025.2.4/lib/lib-client.jar:/home/anon/.cache/JetBrains/RemoteDev/dist/06e67cba3088a_WebStorm-2025.2.4/lib/modules/intellij.libraries.ktor.client.jar",
  "com.intellij.mcpserver.stdio.McpStdioRunnerKt"
  ]
  }
### 8. Documentation
**Current Issue**: Test files lack documentation about their purpose and assumptions.

**Improvements**:
- Add JSDoc comments explaining test purposes and scenarios
- Document test data assumptions and expected behaviors
- Create test README with setup instructions and troubleshooting
- Add inline comments for complex test logic and assertions
- Document test dependencies and environment requirements

### 9. CI/CD Integration
**Current Issue**: Test quality assurance could be stronger in automated pipelines.

**Improvements**:
- Add coverage thresholds enforcement in CI pipelines
- Implement test result reporting and historical trending analysis
- Add mutation testing for critical paths and error handling
- Create test performance monitoring and regression detection
- Implement parallel test execution for faster feedback

### 10. Accessibility & Security Testing
**Current Issue**: No tests for security edge cases or data sanitization.

**Improvements**:
- Add tests for input sanitization and injection prevention
- Test with malformed GraphQL queries and malicious inputs
- Add tests for proper error message sanitization and data leakage prevention
- Verify authentication and authorization boundaries
- Test rate limiting and abuse prevention mechanisms

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. Fix integration test setup and environment configuration
2. Add basic error handling tests for all tools
3. Improve test data quality with shared factories

### Phase 2: Coverage (Week 3-4)
1. Add comprehensive edge case coverage
2. Enhance assertion specificity and validation
3. Implement systematic error scenario testing

### Phase 3: Organization (Week 5-6)
1. Refactor test organization with parameterization
2. Add shared utilities and reduce duplication
3. Improve mock sophistication and verification

### Phase 4: Advanced Features (Week 7-8)
1. Implement CI/CD improvements and monitoring
2. Add security and accessibility testing
3. Create comprehensive documentation

## Success Metrics
- Achieve 100% code coverage (statements, branches, functions, lines)
- Zero flaky tests in CI pipeline
- Integration tests running successfully in CI
- Test execution time under 30 seconds
- All tests passing consistently across environments

## Risk Mitigation
- Implement changes incrementally to avoid breaking existing tests
- Maintain backward compatibility with current test structure
- Add comprehensive test validation before merging improvements
- Monitor test performance and coverage metrics continuously

## Dependencies
- Access to test Sourcegraph instance or mock server
- Environment setup for integration testing
- CI/CD pipeline modifications for enhanced testing
- Team agreement on testing standards and conventions

## Next Steps
1. Review and approve this improvement plan
2. Set up integration test environment
3. Begin implementation with Phase 1 improvements
4. Track progress and adjust plan as needed
