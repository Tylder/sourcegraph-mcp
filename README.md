# Sourcegraph MCP Server

[![npm version](https://badge.fury.io/js/sourcegraph-mcp.svg)](https://www.npmjs.com/package/sourcegraph-mcp)
[![CI](https://github.com/Tylder/sourcegraph-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Tylder/sourcegraph-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Tylder/sourcegraph-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/Tylder/sourcegraph-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

A comprehensive [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that provides AI agents with access to **all Sourcegraph features** including code search, repository management, file browsing, code intelligence, and more.

## Features

- 🔍 **Advanced Code Search** - Search across all your code with filters (repo:, lang:, file:, etc.)
- 📚 **Repository Management** - List, query, and explore repositories
- 📁 **File Operations** - Browse directory trees, read files, view git blame
- 🧠 **Code Intelligence** - Find references, go-to-definition, hover info (when LSIF/SCIP available)
- 🔄 **Batch Changes** - Create and manage large-scale code changes (planned)
- 🔔 **Code Monitoring** - Set up alerts for code patterns (planned)
- 📓 **Notebooks & Insights** - Documentation with live code examples (planned)
- ☁️ **Cloud & Self-Hosted** - Works with both Sourcegraph.com and your private instance

## Installation

```bash
npm install -g sourcegraph-mcp
```

Or use with `npx`:

```bash
npx sourcegraph-mcp
```

## Quick Start

### 1. Get a Sourcegraph Access Token

- **Sourcegraph.com**: https://sourcegraph.com/user/settings/tokens
- **Self-hosted**: `https://your-instance/.../settings/tokens`

### 2. Configure Your AI Agent

Add to your MCP client configuration (e.g., Amp, Claude Desktop):

```json
{
  "mcpServers": {
    "sourcegraph": {
      "command": "npx",
      "args": ["-y", "sourcegraph-mcp"],
      "env": {
        "SRC_ENDPOINT": "https://sourcegraph.com",
        "SRC_ACCESS_TOKEN": "sgp_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

For self-hosted Sourcegraph:

```json
{
  "SRC_ENDPOINT": "http://localhost:7080",
  "SRC_ACCESS_TOKEN": "sgp_local_YOUR_TOKEN_HERE"
}
```

### 3. Use in Your AI Agent

Example queries:
- "Search for authentication functions in my-repo"
- "List all repositories I have access to"
- "Show me the directory structure of repo/src/"
- "Find all references to the User class"

## Available Tools

### Phase 1 (Available Now)

| Tool | Description |
|------|-------------|
| `connection_test` | Test connection and return version/user info |
| `user_info` | Return the current Sourcegraph user's username, email, and organizations |
| `search_code` | Advanced code search with filters |
| `search_symbols` | Search for symbols (functions, classes) |
| `search_commits` | Search git commit messages and diffs |
| `repo_list` | List accessible repositories |
| `repo_info` | Get detailed repository information |
| `repo_branches` | List repository branches |
| `file_tree` | Browse directory structure |
| `file_get` | Get file contents |
| `file_blame` | Get git blame for a file |

### Future Phases

See [SPEC.md](./SPEC.md) for the complete roadmap including code intelligence, batch changes, and more (29 tools total).

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SRC_ENDPOINT` | No | `https://sourcegraph.com` | Sourcegraph instance URL |
| `SRC_ACCESS_TOKEN` | Yes | - | Sourcegraph access token |
| `TIMEOUT_MS` | No | `30000` | API timeout in milliseconds |
| `LOG_LEVEL` | No | `info` | Logging level (error, warn, info, debug) |

## Examples

### Search Code

```typescript
// AI agent can call:
search_code({
  query: "repo:myorg/myrepo lang:typescript function authenticate",
  limit: 10
})
```

**Sourcegraph Query Syntax:**
- `repo:pattern` - Filter by repository
- `lang:typescript` - Filter by language
- `file:regex` - Filter by file path
- `case:yes` - Case-sensitive search
- Boolean operators: `AND`, `OR`, `NOT`
- Regular expressions: `/pattern/`

### List Repositories

```typescript
repo_list({
  query: "myorg",
  limit: 20
})
```

### Browse Files

```typescript
file_tree({
  repo: "github.com/myorg/myrepo",
  path: "src/",
  rev: "main"
})
```

## Development

### Prerequisites

- Node.js 22+
- npm or pnpm
- Sourcegraph access token

### Setup

```bash
git clone https://github.com/Tylder/sourcegraph-mcp.git
cd sourcegraph-mcp
npm install
```

### Development Workflow

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Lint and format
npm run lint
npm run format

# Type check
npm run typecheck

# Build
npm run build
```

### Staged File Workflow

We enforce formatting and linting on staged TypeScript files via [lint-staged](https://github.com/okonet/lint-staged).

- Husky runs `npm run lint-staged` as part of the pre-commit hook.
- All staged `*.ts`/`*.tsx` files are automatically processed with ESLint (with `--fix`) and Prettier.
- If a file is modified by the hook, re-stage the file (`git add <file>`) before retrying the commit.

### Testing

We maintain **100% test coverage**. See [AGENTS.md](./AGENTS.md) for testing philosophy and workflow.

```bash
npm run coverage
```

## Architecture

- **Language**: TypeScript with ESM modules
- **Protocol**: Model Context Protocol (MCP)
- **API**: Sourcegraph GraphQL API
- **Transport**: stdio (HTTP/SSE planned for Phase 6)
- **Testing**: Vitest with 100% coverage target

See [SPEC.md](./SPEC.md) for detailed architecture and tool specifications.

## Contributing

We welcome contributions! Please see [AGENTS.md](./AGENTS.md) for:
- Development workflow
- Code quality standards
- Testing requirements
- Git hooks and CI/CD

## Roadmap

- ✅ **Phase 1**: Search, repositories, files (Current)
- 🚧 **Phase 2**: Code intelligence (references, definitions)
- 📋 **Phase 3**: Batch changes
- 📋 **Phase 4**: Code monitoring
- 📋 **Phase 5**: Notebooks & insights
- 📋 **Phase 6**: HTTP/SSE transport

See [SPEC.md](./SPEC.md) for complete roadmap.

## License

MIT

## Credits

Built with:
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Sourcegraph GraphQL API](https://sourcegraph.com/docs)
- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)

---

**Questions?** Open an issue or check the [Sourcegraph docs](https://sourcegraph.com/docs).
