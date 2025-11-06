# Sourcegraph MCP Server - Complete Tool Specification

## Architecture Decisions

- **Language**: TypeScript/Node.js with ESM
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **API Client**: GraphQL (`graphql-request`)
- **Tool Organization**: Categorized with prefixes
- **Error Handling**: Graceful degradation
- **Configuration**: Environment variables (`SRC_ENDPOINT`, `SRC_ACCESS_TOKEN`)
- **Transport Mode**: stdio (default) - HTTP/SSE mode planned for Phase 6

### Future: HTTP/SSE Transport (Phase 6)

Currently uses stdio transport (spawned on-demand by agent). HTTP/SSE mode will be added later for:
- Always-on server (docker-compose)
- Multi-client support
- Connection pooling/caching

Configuration will support both modes via `MCP_TRANSPORT` env var.

## Complete Tool List

### Phase 1: Search, Repositories & Files (MVP)

#### Search Tools
- **`search_code`**
  - Execute Sourcegraph code search with advanced filters
  - Params: `query`, `limit`, `timeout`
  - Returns: Match results with file context, line numbers, repos

- **`search_symbols`**
  - Search for symbols (functions, classes, variables)
  - Params: `query`, `types[]`, `limit`
  - Returns: Symbol definitions with locations

- **`search_commits`**
  - Search git commit messages and diffs
  - Params: `query`, `author`, `after`, `before`, `limit`
  - Returns: Commit info with diffs

#### Repository Tools
- **`repo_list`**
  - List all accessible repositories
  - Params: `query`, `first`, `after`, `orderBy`
  - Returns: Repository names, URLs, metadata

- **`repo_info`**
  - Get detailed repository information
  - Params: `name`
  - Returns: Clone status, default branch, description, stats

- **`repo_branches`**
  - List branches in a repository
  - Params: `repo`, `query`, `limit`
  - Returns: Branch names, target commits

#### File & Directory Tools
- **`file_tree`**
  - Browse directory structure
  - Params: `repo`, `path`, `rev`
  - Returns: Files and directories with metadata

- **`file_get`**
  - Get file contents
  - Params: `repo`, `path`, `rev`
  - Returns: File content, language, size

- **`file_blame`**
  - Get git blame for a file
  - Params: `repo`, `path`, `rev`
  - Returns: Line-by-line author, commit, date

### Phase 2: Code Intelligence (Requires LSIF/SCIP indexing)

#### Code Navigation Tools
- **`intel_references`**
  - Find all references to a symbol
  - Params: `repo`, `path`, `line`, `character`
  - Returns: All usage locations

- **`intel_definitions`**
  - Go to definition of a symbol
  - Params: `repo`, `path`, `line`, `character`
  - Returns: Definition location

- **`intel_implementations`**
  - Find implementations of an interface/abstract
  - Params: `repo`, `path`, `line`, `character`
  - Returns: Implementation locations

- **`intel_hover`**
  - Get hover documentation for a symbol
  - Params: `repo`, `path`, `line`, `character`
  - Returns: Type info, documentation

### Phase 3: Batch Changes

#### Batch Change Tools
- **`batch_create`**
  - Create a new batch change
  - Params: `spec`, `name`, `description`
  - Returns: Batch change ID, preview URL

- **`batch_list`**
  - List batch changes
  - Params: `state`, `first`, `after`
  - Returns: Batch changes with status

- **`batch_info`**
  - Get batch change details
  - Params: `id`
  - Returns: Full batch change info, changesets

- **`batch_apply`**
  - Apply a batch change
  - Params: `id`
  - Returns: Application status

### Phase 4: Monitoring & Saved Searches

#### Code Monitor Tools
- **`monitor_create`**
  - Create a code monitor
  - Params: `query`, `description`, `actions[]`
  - Returns: Monitor ID

- **`monitor_list`**
  - List active monitors
  - Params: `first`, `after`
  - Returns: Monitors with trigger info

- **`monitor_delete`**
  - Delete a code monitor
  - Params: `id`
  - Returns: Success status

#### Saved Search Tools
- **`search_save`**
  - Save a search query
  - Params: `query`, `description`, `notify`
  - Returns: Saved search ID

- **`search_saved_list`**
  - List saved searches
  - Params: `first`, `after`
  - Returns: Saved searches

### Phase 5: Notebooks & Insights

#### Notebook Tools
- **`notebook_create`**
  - Create a notebook
  - Params: `title`, `blocks[]`, `public`
  - Returns: Notebook ID, URL

- **`notebook_list`**
  - List notebooks
  - Params: `query`, `first`, `after`
  - Returns: Notebooks

- **`notebook_get`**
  - Get notebook content
  - Params: `id`
  - Returns: Full notebook with blocks

#### Insights Tools
- **`insight_create`**
  - Create a code insight
  - Params: `title`, `series[]`, `repositories[]`
  - Returns: Insight ID

- **`insight_list`**
  - List code insights
  - Params: `first`, `after`
  - Returns: Insights with data

### Utility Tools (All Phases)

- **`connection_test`**
  - Test Sourcegraph connection
  - Params: none
  - Returns: Version, user info, permissions

- **`user_info`**
  - Get current user information
  - Params: none
  - Returns: Username, email, organizations

## Tool Naming Convention

- Prefix indicates category: `search_`, `repo_`, `file_`, `intel_`, `batch_`, `monitor_`, `notebook_`, `insight_`
- Action is verb: `list`, `get`, `create`, `delete`, `apply`
- Clear and discoverable: `{category}_{action}_{?target}`

## Total Tool Count

- **Phase 1**: 9 tools (MVP)
- **Phase 2**: 4 tools (Code Intelligence)
- **Phase 3**: 4 tools (Batch Changes)
- **Phase 4**: 5 tools (Monitoring)
- **Phase 5**: 5 tools (Notebooks/Insights)
- **Utility**: 2 tools (Always available)

**Grand Total**: 29 tools

## Implementation Priority

1. **Immediate** (Phase 1): Core search, repo, file operations
2. **High** (Phase 2): Code intelligence if LSIF available
3. **Medium** (Phase 3-4): Batch changes, monitoring
4. **Low** (Phase 5): Notebooks, insights (nice to have)
