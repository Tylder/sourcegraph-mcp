# MCP Tool Failures Report

## Overview
During testing of the Sourcegraph MCP server tools against a local Sourcegraph instance (version 6.9.2509), several tools failed due to GraphQL schema mismatches. The local instance appears to be running a different API version or configuration than what the MCP queries expect.

## Successful Tools
- `mcp__sourcegraph__connection_test`
- `mcp__sourcegraph__user_info`
- `mcp__sourcegraph__repo_list`
- `mcp__sourcegraph__repo_branches`
- `mcp__sourcegraph__search_code`
- `mcp__sourcegraph__search_symbols`
- `mcp__sourcegraph__search_commits`

## Failed Tools and Fixes

### 1. `mcp__sourcegraph__repo_languages`
**Error:** `Cannot query field "languageStatistics" on type "Repository"`

**Root Cause:** The `languageStatistics` field is not available in the server's Repository type.

**Fix:** Remove the `languageStatistics` field from the query, as language statistics may not be supported in this Sourcegraph version.

**File to Edit:** `src/graphql/queries/repos.ts`
**Change:** Remove lines 151-158 from `REPO_LANGUAGES_QUERY`:
```graphql
languageStatistics {
  name
  displayName
  color
  totalBytes
  totalLines
  percentage
}
```

### 2. `mcp__sourcegraph__file_tree`
**Error:** `Cannot query field "byteSize" on type "TreeEntry"`

**Root Cause:** The `byteSize` field is not available in the TreeEntry type.

**Fix:** Remove the `byteSize` field from the query.

**File to Edit:** `src/graphql/queries/file-tree.ts`
**Change:** Remove line 20: `byteSize`

### 3. `mcp__sourcegraph__file_get`
**Errors:**
- `Variable "$rev" of type "String" used in position expecting type "String!"`
- `Cannot query field "language" on type "HighlightedFile"`

**Root Cause:** The `$rev` parameter type is incorrect, and the `language` field in highlight is not available.

**Fix:** Change `$rev: String` to `$rev: String!`, remove the `language` field from highlight.

**File to Edit:** `src/graphql/queries/file.ts`
**Change:**
- Line 6: Change `$rev: String` to `$rev: String!`
- Remove line 19: `language`

### 4. `mcp__sourcegraph__file_blame`
**Errors:**
- `Variable "$rev" of type "String" used in position expecting type "String!"`
- `Cannot query field "ranges" on type "Hunk"`

**Root Cause:** The `$rev` parameter type is incorrect, and the `ranges` field structure is different.

**Fix:** Change `$rev: String` to `$rev: String!`, remove the `ranges` block (the blame API may have a different structure in this version).

**File to Edit:** `src/graphql/queries/blame.ts`
**Change:**
- Line 6: Change `$rev: String` to `$rev: String`
- Remove lines 15-31 (the entire `ranges` block)

**Note:** This may require reimplementing the blame tool to use a different API structure if available.

### 5. `mcp__sourcegraph__repo_compare_commits`
**Errors:**
- `Cannot query field "expression" on type "GitRevisionRange"`
- `Cannot query field "isBinary" on type "FileDiff"`
- `Cannot query field "changed" on type "DiffStat"`

**Root Cause:** These fields are not available in the respective types.

**Fix:** Remove the unavailable fields.

**File to Edit:** `src/graphql/queries/repos.ts`
**Change in `REPO_COMPARISON_QUERY`:**
- Remove line 99: `expression`
- Remove line 122: `isBinary`
- Remove line 125: `changed`

### 6. `mcp__sourcegraph__repo_info` (Partial Failure)
**Error:** `Repository not found: github.com/sourcegraph/sourcegraph`

**Root Cause:** The test repository does not exist in the local Sourcegraph instance.

**Fix:** This is not a code issue - the tool works correctly. Use existing repositories for testing (e.g., `github.com/Tylder/LaunchQuay`).

## Recommendations
1. **Version Compatibility:** Update the MCP server to be compatible with Sourcegraph 6.9.x API.
2. **Conditional Queries:** Implement version detection and use different queries based on server capabilities.
3. **Documentation:** Add version requirements to README.md.
4. **Testing:** Add integration tests against different Sourcegraph versions.

## Next Steps
Apply the fixes above, then re-run the tests to verify functionality.
