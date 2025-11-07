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

Sourcegraph's public GraphQL documentation confirms coverage for search,
repository metadata, file access, and analytics, all of which can be explored
in the hosted API console and documentation hub
([Sourcegraph GraphQL API overview](https://sourcegraph.com/docs/api/graphql)).

### Phase 1: Search, Repositories & Files (MVP)

#### Search Tools
- **`search_code`**
  - Execute Sourcegraph code search with advanced filters (GraphQL `search` query)
  - Params: `query`, `limit`, `version`, `timeout`
  - Returns: Match and metadata sets (repositories, file matches, commits) plus cost/status flags
  - Docs: https://sourcegraph.com/docs/api/graphql/search

- **`search_symbols`**
  - Search for symbols (functions, classes, variables)
  - Params: `query`, `types[]`, `limit`
  - Returns: Symbol definitions with locations
  - Docs: https://sourcegraph.com/docs/api/graphql/search

- **`search_commits`**
  - Search git commit messages and diffs
  - Params: `query`, `author`, `after`, `before`, `limit`
  - Returns: Commit info with diffs
  - Docs: https://sourcegraph.com/docs/api/graphql/search

#### Repository Tools
- **`repo_list`**
  - List all accessible repositories via GraphQL connections
  - Params: `query`, `first`, `after`, `orderBy`
  - Returns: Repository nodes, names, URLs, external links, pagination info
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

- **`repo_info`**
  - Get detailed repository information
  - Params: `name`
  - Returns: Clone status, default branch, description, stats
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

- **`repo_branches`**
  - List branches in a repository
  - Params: `repo`, `query`, `limit`
  - Returns: Branch names, target commits
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

- **`repo_compare_commits`**
  - Compare two revisions using the GraphQL `comparison` resolver
  - Params: `repo`, `baseRev`, `headRev`
  - Returns: Commit range metadata and diff previews for review tooling
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

- **`repo_languages`**
  - Retrieve language usage statistics for a repository
  - Params: `repo`, `rev`
  - Returns: Language share breakdowns for insight tooling
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

#### File & Directory Tools
- **`file_tree`**
  - Browse directory structure using GraphQL `tree` data
  - Params: `repo`, `path`, `rev`
  - Returns: Files and directories with metadata
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

- **`file_get`**
  - Get file contents via `blob` on commits
  - Params: `repo`, `path`, `rev`
  - Returns: File content, language, size
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

- **`file_blame`**
  - Get git blame for a file
  - Params: `repo`, `path`, `rev`
  - Returns: Line-by-line author, commit, date
  - Docs: https://sourcegraph.com/docs/api/graphql/examples

### Phase 2: Code Intelligence (Requires LSIF/SCIP indexing)

#### Code Navigation Tools
- **`intel_references`**
  - Find all references to a symbol
  - Params: `repo`, `path`, `line`, `character`
  - Returns: All usage locations
  - Docs: https://sourcegraph.com/docs/code-search/code-navigation/precise_code_navigation

- **`intel_definitions`**
  - Go to definition of a symbol
  - Params: `repo`, `path`, `line`, `character`
  - Returns: Definition location
  - Docs: https://sourcegraph.com/docs/code-search/code-navigation/precise_code_navigation

- **`intel_implementations`**
  - Find implementations of an interface/abstract
  - Params: `repo`, `path`, `line`, `character`
  - Returns: Implementation locations
  - Docs: https://sourcegraph.com/docs/code-search/code-navigation/precise_code_navigation

- **`intel_hover`**
  - Get hover documentation for a symbol
  - Params: `repo`, `path`, `line`, `character`
  - Returns: Type info, documentation
  - Docs: https://sourcegraph.com/docs/code-search/code-navigation/precise_code_navigation

### Phase 3: Batch Changes

#### Batch Change Tools
- **`batch_create`**
  - Create a new batch change
  - Params: `spec`, `name`, `description`
  - Returns: Batch change ID, preview URL
  - Docs: https://sourcegraph.com/docs/batch-changes

- **`batch_list`**
  - List batch changes
  - Params: `state`, `first`, `after`
  - Returns: Batch changes with status
  - Docs: https://sourcegraph.com/docs/batch-changes

- **`batch_info`**
  - Get batch change details
  - Params: `id`
  - Returns: Full batch change info, changesets
  - Docs: https://sourcegraph.com/docs/batch-changes

- **`batch_apply`**
  - Apply a batch change
  - Params: `id`
  - Returns: Application status
  - Docs: https://sourcegraph.com/docs/batch-changes

### Phase 4: Monitoring & Saved Searches

#### Code Monitor Tools
- **`monitor_create`**
  - Create a code monitor
  - Params: `query`, `description`, `actions[]`
  - Returns: Monitor ID
  - Docs: https://sourcegraph.com/docs/code_monitoring

- **`monitor_list`**
  - List active monitors
  - Params: `first`, `after`
  - Returns: Monitors with trigger info
  - Docs: https://sourcegraph.com/docs/code_monitoring

- **`monitor_delete`**
  - Delete a code monitor
  - Params: `id`
  - Returns: Success status
  - Docs: https://sourcegraph.com/docs/code_monitoring

#### Saved Search Tools
- **`search_save`**
  - Save a search query
  - Params: `query`, `description`, `notify`
  - Returns: Saved search ID
  - Docs: https://sourcegraph.com/docs/code-search/working/saved_searches

- **`search_saved_list`**
  - List saved searches
  - Params: `first`, `after`
  - Returns: Saved searches
  - Docs: https://sourcegraph.com/docs/code-search/working/saved_searches

### Phase 5: Notebooks & Insights

#### Notebook Tools
- **`notebook_create`**
  - Create a notebook
  - Params: `title`, `blocks[]`, `public`
  - Returns: Notebook ID, URL
  - Docs: https://sourcegraph.com/docs/notebooks

- **`notebook_list`**
  - List notebooks
  - Params: `query`, `first`, `after`
  - Returns: Notebooks
  - Docs: https://sourcegraph.com/docs/notebooks

- **`notebook_get`**
  - Get notebook content
  - Params: `id`
  - Returns: Full notebook with blocks
  - Docs: https://sourcegraph.com/docs/notebooks

#### Insights Tools
- **`insight_create_line_chart`**
  - Create a persisted search insight (`createLineChartSearchInsight`)
  - Params: `options.title`, `dataSeries[]` with queries, repo scope, time interval
  - Returns: Insight view ID for the new line chart
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#creating-a-persisted-insight

- **`insight_create_pie_chart`**
  - Create a language usage pie chart (`createPieChartSearchInsight`)
  - Params: `repositoryScope.repositories`, presentation options, optional filters
  - Returns: Insight view ID for the pie chart
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#creating-a-pie-chart-insight

- **`insight_get`**
  - Retrieve a single insight with data series, definitions, and presentation (`insightViews`)
  - Params: `id`, optional `filters`
  - Returns: Insight view nodes including series points and presentation metadata
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#reading-a-single-code-insight

- **`insight_list`**
  - List insight views with pagination (`insightViews` connection)
  - Params: `first`, `after`, optional `filters`
  - Returns: Insight IDs plus page info for iteration
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#list-code-insights

- **`insight_update_line_chart`**
  - Update an existing line chart insight (`updateLineChartSearchInsight`)
  - Params: `id`, replacement input including presentation, controls, series definitions
  - Returns: Updated view identifier; omitted series are deleted
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#updating-a-code-insight

- **`insight_delete`**
  - Delete an insight view (`deleteInsightView`)
  - Params: `id`
  - Returns: Confirmation via `alwaysNil`
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#deleting-a-code-insight

- **`dashboard_create`**
  - Create an insights dashboard with grants (`createInsightsDashboard`)
  - Params: `title`, `grants` (users, orgs, global)
  - Returns: Dashboard ID for attaching insights
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#creating-a-dashboard

- **`dashboard_add_insight`**
  - Attach an insight to a dashboard (`addInsightViewToDashboard`)
  - Params: `dashboardId`, `insightViewId`
  - Returns: Dashboard reference confirming linkage
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#adding-and-removing-code-insights-from-a-dashboard

- **`dashboard_remove_insight`**
  - Detach an insight from a dashboard (`removeInsightViewFromDashboard`)
  - Params: `dashboardId`, `insightViewId`
  - Returns: Dashboard reference confirming removal
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-code-insights-with-api#adding-and-removing-code-insights-from-a-dashboard

### Phase 6: Search Context Management

#### Search Context Tools
- **`context_create`**
  - Create a search context with namespace and repository revisions (`createSearchContext`)
  - Params: `searchContext` (name, description, namespace, visibility), `repositories[]`
  - Returns: Context ID and spec for subsequent use
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-search-contexts-with-api#create-a-context

- **`context_get`**
  - Fetch a single search context by ID (`node` → `SearchContext`)
  - Params: `id`
  - Returns: Context spec and metadata for validation or editing
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-search-contexts-with-api#read-a-single-context

- **`context_list`**
  - List available contexts with namespace and query filters (`searchContexts` connection)
  - Params: `first`, optional `after`, `query`, `namespaces[]`, `orderBy`, `descending`
  - Returns: Context nodes with pagination and total count
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-search-contexts-with-api#list-available-contexts

- **`context_update`**
  - Update an existing context, replacing settings and repositories (`updateSearchContext`)
  - Params: `id`, edited context input, full repository list
  - Returns: Updated context ID and spec
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-search-contexts-with-api#update-a-context

- **`context_delete`**
  - Delete a search context (`deleteSearchContext`)
  - Params: `id`
  - Returns: Confirmation via `alwaysNil`
  - Docs: https://sourcegraph.com/docs/api/graphql/managing-search-contexts-with-api#delete-a-context

### Phase 7: Analytics & Usage

#### Analytics Tools
- **`analytics_active_users`**
  - Report active users for the current month (`users(activePeriod: THIS_MONTH)`)
  - Params: optional filters aligned with the analytics query
  - Returns: Activity metrics for administrative monitoring
  - Docs: https://sourcegraph.com/docs/admin/usage_statistics

### Utility Tools (All Phases)

- **`connection_test`**
  - Test Sourcegraph connection
  - Params: none
  - Returns: Version, user info, permissions
  - Docs: https://sourcegraph.com/docs/api/graphql

- **`user_info`**
  - Get current user information
  - Params: none
  - Returns: Username, email, organizations
  - Docs: https://sourcegraph.com/docs/api/graphql

## Tool Naming Convention

- Prefix indicates category: `search_`, `repo_`, `file_`, `intel_`, `batch_`, `monitor_`, `notebook_`, `insight_`, `dashboard_`, `context_`, `analytics_`
- Action is verb: `list`, `get`, `create`, `delete`, `apply`
- Clear and discoverable: `{category}_{action}_{?target}`

## Total Tool Count

- **Phase 1**: 11 tools (MVP)
- **Phase 2**: 4 tools (Code Intelligence)
- **Phase 3**: 4 tools (Batch Changes)
- **Phase 4**: 5 tools (Monitoring)
- **Phase 5**: 12 tools (Notebooks/Insights)
- **Phase 6**: 5 tools (Search Contexts)
- **Phase 7**: 1 tool (Analytics)
- **Utility**: 2 tools (Always available)

**Grand Total**: 44 tools

## Implementation Priority

1. **Immediate** (Phase 1): Core search, repo, file operations
2. **High** (Phase 2): Code intelligence if LSIF available
3. **Medium** (Phase 3-4): Batch changes, monitoring
4. **Medium** (Phase 5-6): Insight management and search contexts once core workflows are stable
5. **Low** (Phase 7): Analytics/usage reporting utilities
