# Sourcegraph MCP Server - Agent Instructions

## Project Overview

A comprehensive Model Context Protocol (MCP) server providing AI agents with access to all Sourcegraph features including search, code intelligence, batch changes, and more.

## Development Requirements

### Version Management

**CRITICAL**: Always use the latest compatible versions of all dependencies.

- Before adding ANY new dependency, check compatibility with existing packages
- Use `npm outdated` to check for updates regularly
- Verify peer dependencies are satisfied
- Test after upgrading any dependency

### Testing Requirements

**MANDATORY**: This project must be fully tested before any code is merged.

#### Test Coverage Requirements
- Minimum 80% code coverage for all modules
- 100% coverage for critical paths (authentication, API calls)
- Unit tests for all tools
- Integration tests for GraphQL queries
- E2E tests for full tool workflows

#### Git Hooks (Husky)
Pre-commit hooks must:
- Run linter (ESLint)
- Run formatter (Prettier)
- Run type checking (TypeScript)
- Run unit tests
- Check for sensitive data (tokens, keys)

Pre-push hooks must:
- Run full test suite
- Verify build succeeds
- Check test coverage thresholds

#### CI/CD Pipeline (GitHub Actions)
Must run on every PR and push to main:
- Lint and format check
- Type checking
- Full test suite with coverage
- Build verification
- Integration tests against real Sourcegraph instance (test account)
- Publish to npm on tagged releases

### Technology Stack

- **Language**: TypeScript 5.x (latest stable)
- **Runtime**: Node.js 22 LTS
- **Package Manager**: npm (matches Node.js LTS)
- **Module System**: ESM (ES modules)
- **MCP SDK**: `@modelcontextprotocol/sdk` (latest)
- **GraphQL Client**: `graphql-request` (latest compatible)
- **Testing**: Vitest (latest)
- **Linting**: ESLint 9+ (flat config)
- **Formatting**: Prettier (latest)
- **Git Hooks**: Husky (latest)

### Project Structure

```
sourcegraph-mcp/
├── src/
│   ├── index.ts              # Entry point, MCP server setup
│   ├── tools/                # Tool implementations
│   │   ├── search/           # Search tools
│   │   ├── repos/            # Repository tools
│   │   ├── files/            # File tools
│   │   ├── intel/            # Code intelligence tools
│   │   ├── batch/            # Batch change tools
│   │   └── util/             # Utility tools
│   ├── graphql/              # GraphQL queries and client
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Shared utilities
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── .github/
│   └── workflows/            # CI/CD workflows
├── dist/                     # Build output
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── SPEC.md                   # Tool specifications
├── AGENTS.md                 # This file
└── README.md                 # User documentation
```

### Environment Variables

Required for runtime:
- `SRC_ENDPOINT` - Sourcegraph instance URL (default: https://sourcegraph.com)
- `SRC_ACCESS_TOKEN` - Sourcegraph access token

Optional:
- `LOG_LEVEL` - Logging verbosity (default: info)
- `TIMEOUT_MS` - API timeout in milliseconds (default: 30000)

### Development Workflow

1. **Before coding**: Read SPEC.md for tool requirements
2. **Write tests first**: TDD approach for all tools
3. **Implement tool**: Follow existing patterns
4. **Run tests locally**: `npm test`
5. **Check coverage**: `npm run coverage`
6. **Lint and format**: `npm run lint && npm run format`
7. **Build**: `npm run build`
8. **Commit**: Git hooks will run automatically
9. **Push**: Pre-push hooks verify everything passes
10. **PR**: CI/CD must pass before merge

### Common Commands

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Build for production
npm run build

# Test the built server
npm start
```

### GraphQL API Usage

- All Sourcegraph API calls use GraphQL (not REST)
- Queries are stored in `src/graphql/queries/`
- Use typed GraphQL client from `src/graphql/client.ts`
- Handle rate limiting gracefully
- Implement retry logic with exponential backoff
- Cache responses where appropriate

### Error Handling

- **Graceful degradation**: Return partial results when possible
- Include error context in responses
- Never crash the MCP server
- Log errors appropriately
- Provide actionable error messages to AI agents

### Code Quality Standards

- **TypeScript**: Strict mode enabled
- **No `any` types**: Use proper typing
- **Pure functions**: Where possible
- **Immutable data**: Use readonly, const
- **Comments**: JSDoc for public APIs
- **Naming**: Clear, descriptive names
- **File size**: Max 300 lines per file
- **Function complexity**: Keep cyclomatic complexity low

### Security Requirements

- Never log or expose access tokens
- Validate all input parameters
- Sanitize user-provided queries
- Use environment variables for secrets
- Implement rate limiting
- Follow principle of least privilege

### Performance Guidelines

- Optimize GraphQL queries (request only needed fields)
- Implement pagination for large result sets
- Use connection pooling
- Cache frequently accessed data
- Stream large responses when possible
- Set appropriate timeouts

### Documentation Requirements

Every tool must have:
- Clear description
- Parameter documentation
- Return value documentation
- Example usage
- Error conditions
- GraphQL query used

### Release Process

1. Update version in package.json (semantic versioning)
2. Update CHANGELOG.md
3. Run full test suite
4. Create git tag: `git tag v1.0.0`
5. Push tag: `git push origin v1.0.0`
6. GitHub Actions will publish to npm automatically
7. Create GitHub release with notes

## Phase 1 Implementation Checklist

- [ ] Project setup (TypeScript, ESM, dependencies)
- [ ] Git hooks (Husky + lint-staged)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] GraphQL client setup
- [ ] MCP server boilerplate
- [ ] Connection test tool
- [ ] Search tools (code, symbols, commits)
- [ ] Repository tools (list, info, branches)
- [ ] File tools (tree, get, blame)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Documentation (README, API docs)
- [ ] npm package publishing

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Sourcegraph GraphQL API](http://localhost:7080/api/console)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)

## Notes for AI Agents

- Always check SPEC.md for tool definitions before implementing
- Run tests before committing
- Verify GraphQL queries against Sourcegraph schema
- Keep tools focused and single-purpose
- Prioritize Phase 1 tools before moving to Phase 2+
- Ask questions if requirements are unclear
