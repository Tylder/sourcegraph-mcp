# Sourcegraph MCP Server - Agent Instructions

## Project Overview

A comprehensive Model Context Protocol (MCP) server providing AI agents with access to all Sourcegraph features including search, code intelligence, batch changes, and more.

## Development Requirements

### Version Management

**CRITICAL**: Always use the latest compatible versions of all dependencies.

- Before adding ANY new dependency, check compatibility with existing packages
- **After adding or editing dependencies in package.json, ALWAYS run `npm install`**
- If `npm install` fails, troubleshoot and fix the error:
  - Check if the version exists: `npm view package-name versions --json`
  - Use the latest compatible version from the list
  - Verify peer dependencies are satisfied
  - Update package.json with the correct version
- Use `npm outdated` to check for updates regularly
- Test after upgrading any dependency

### Testing Requirements

**MANDATORY**: This project must be fully tested before any code is merged.

#### Test Coverage Requirements
- **Target: 100% code coverage** for all modules (statements, branches, functions, lines)
- Minimum 80% if 100% is not achievable without hacks or testing implementation details
- 100% coverage for critical paths (authentication, API calls)
- Unit tests for all tools
- Integration tests for GraphQL queries
- E2E tests for full tool workflows

**Coverage Philosophy:**
- Aim for 100% coverage by testing all realistic code paths
- Do NOT use hacks or contortions to hit 100% (e.g., testing private methods, artificial branches)
- If a branch is truly unreachable or testing it requires ugly mocks, document why and accept <100%
- If you can't reach 100% easily, ensure you have at least 80% and all critical paths covered

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

#### When to Run Pre-commit Checks

**Run checks after each tool implementation** (before moving to next tool):

1. **Implement tool**: Complete one tool function + GraphQL query + types
2. **Register tool**: Update index.ts to register the tool
3. **→ RUN PRE-COMMIT CHECKS**: `npm run format && npm run lint && npm run typecheck`
4. **→ RUN PRE-PUSH CHECKS**: `npm run coverage && npm run build`
5. **Fix issues**: Address any errors AND low coverage while context is fresh
6. **Move to next tool**: Repeat for next tool
7. **After 2-3 tools**: Commit logical units (e.g., "Add all search tools")

**Do NOT run checks:**
- After every single file (too frequent, code often incomplete)
- Only before commit (too late, hard to debug)

**Example workflow:**
```bash
# Implement search_code tool + write tests
# → npm run format && npm run lint && npm run typecheck
# → npm run coverage && npm run build
# Fix any issues + ensure 80%+ coverage

# Implement search_symbols tool + write tests
# → npm run format && npm run lint && npm run typecheck
# → npm run coverage && npm run build
# Fix any issues + ensure 80%+ coverage

# Implement search_commits tool + write tests
# → npm run format && npm run lint && npm run typecheck
# → npm run coverage && npm run build
# Fix any issues + ensure 80%+ coverage

# Commit: "Add Phase 1 search tools"
git add -A
git commit -m "feat: add search_code, search_symbols, search_commits tools"
```

**Why run pre-push checks early?**
- Catches coverage gaps while context is fresh
- Surfaces missing tests immediately (easier to fix)
- Verifies build succeeds with new code
- Prevents "write all code, test later" anti-pattern

#### Full Development Checklist

1. **Before coding**: Read SPEC.md for tool requirements
2. **Implement tool + tests**: Follow existing patterns, write tests immediately
3. **Run pre-commit checks**: `npm run format && npm run lint && npm run typecheck`
4. **Run pre-push checks**: `npm run coverage && npm run build`
5. **Fix issues**: Address errors and coverage gaps immediately
6. **Repeat**: Continue for next tool
7. **Commit batch**: After 2-3 tools, commit logical unit
8. **Push**: Pre-push hooks verify coverage and build (should already pass)
9. **PR**: CI/CD must pass before merge

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

### Merging Multiple Feature Branches

When merging multiple parallel feature branches that each add independent files but modify the same central integration file (e.g., index.ts):

**Use `git checkout <branch> -- <files>` instead of `git merge`:**

```bash
# For each feature branch, cherry-pick only its specific files:
git checkout origin/feature-1 -- src/tools/feature1.ts tests/unit/tools/feature1.test.ts
git checkout origin/feature-2 -- src/tools/feature2.ts tests/unit/tools/feature2.test.ts
git checkout origin/feature-3 -- src/tools/feature3.ts tests/unit/tools/feature3.test.ts

# Then manually update central integration files:
# - Update index.ts to register all new tools
# - Combine any shared query/type files
# - Test everything together
```

**When to use this pattern:**
- ✓ Multiple parallel feature branches
- ✓ Each adds independent files (tools, tests, queries)
- ✓ One central file (index.ts) ties them together
- ✗ Don't use if branches heavily modify shared code

**Advantages:**
- No merge conflicts in feature files
- Central integration done once, manually, with full context
- Cleaner git history

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
