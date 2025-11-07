#!/usr/bin/env node
/**
 * Sourcegraph MCP Server
 * Entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { type ZodTypeAny } from 'zod';
import { getConfig, validateConfig } from './config.js';
import { SourcegraphClient } from './graphql/client.js';
import { testConnection } from './tools/util/connection.js';
import { getUserInfo } from './tools/util/user_info.js';
import { searchCode } from './tools/search/code.js';
import { searchSymbols } from './tools/search/symbols.js';
import { searchCommits } from './tools/search/commits.js';
import { repoList } from './tools/repos/list.js';
import { repoInfo } from './tools/repos/info.js';
import { repoBranches } from './tools/repos/branches.js';
import { fileTree } from './tools/files/tree.js';
import { fileGet } from './tools/files/get.js';
import { fileBlame } from './tools/files/file_blame.js';
import { repoCompareCommits } from './tools/repos/repo_compare_commits.js';
import { repoLanguages } from './tools/repos/repo_languages.js';
import {
  searchCodeSchema,
  searchSymbolsSchema,
  searchCommitsSchema,
  repoListSchema,
  repoInfoSchema,
  repoBranchesSchema,
  fileTreeSchema,
  fileGetSchema,
  fileBlameSchema,
  repoCompareCommitsSchema,
  repoLanguagesSchema,
} from './schemas.js';

// Get and validate configuration
const config = getConfig();
validateConfig(config);

// Create Sourcegraph client
const sgClient = new SourcegraphClient(config);

// Create MCP server
const server = new McpServer({
  name: 'Sourcegraph MCP Server',
  version: '0.1.0',
});

/**
 * Helper function to register MCP tools with consistent error handling and response formatting
 * @param server - The MCP server instance
 * @param name - Tool name
 * @param description - Tool description
 * @param schema - Optional Zod schema for parameters
 * @param handler - Function that takes (sgClient, args) and returns string or object
 * @param stringifyResult - Whether to JSON.stringify object results
 * @param errorPrefix - Prefix for error messages
 */
function registerTool(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, ZodTypeAny> | undefined,
  handler: (sgClient: SourcegraphClient, args: unknown) => Promise<unknown>,
  stringifyResult = true,
  errorPrefix = '',
) {
  const toolHandler = async (args: unknown) => {
    try {
      const result = await handler(sgClient, args);
      const text =
        stringifyResult && typeof result === 'object'
          ? JSON.stringify(result, null, 2)
          : String(result);
      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: errorPrefix + message,
          },
        ],
      };
    }
  };

  const options = {
    title: name,
    description,
    ...(schema && { inputSchema: schema }),
  };
  server.registerTool(name, options, toolHandler);
}

// Register tools
registerTool(
  server,
  'connection_test',
  'Test connection to Sourcegraph and return version/user info',
  undefined,
  async (sgClient) => await testConnection(sgClient),
  true,
);

registerTool(
  server,
  'user_info',
  "Return the current Sourcegraph user's username, email, and organizations",
  undefined,
  async (sgClient) => await getUserInfo(sgClient),
  true,
  'Error fetching user info: ',
);

registerTool(
  server,
  'search_code',
  'Search for code in Sourcegraph using advanced query syntax. Supports filters like repo:, lang:, file:, etc.',
  searchCodeSchema,
  async (sgClient, args) => await searchCode(sgClient, args as { query: string; limit?: number }),
  false,
);

registerTool(
  server,
  'search_symbols',
  'Search for symbols (functions, classes, variables, etc.) in Sourcegraph',
  searchSymbolsSchema,
  async (sgClient, args) =>
    await searchSymbols(sgClient, args as { query: string; types?: string[]; limit?: number }),
  false,
);

registerTool(
  server,
  'search_commits',
  'Search git commit messages and diffs in Sourcegraph',
  searchCommitsSchema,
  async (sgClient, args) =>
    await searchCommits(
      sgClient,
      args as { query: string; author?: string; after?: string; before?: string; limit?: number },
    ),
  false,
);

registerTool(
  server,
  'repo_list',
  'List repositories available on Sourcegraph with optional filtering',
  repoListSchema,
  async (sgClient, args) => await repoList(sgClient, args as { query?: string; first?: number }),
  false,
);

registerTool(
  server,
  'repo_info',
  'Get detailed information about a Sourcegraph repository including clone status and metadata',
  repoInfoSchema,
  async (sgClient, args) => await repoInfo(sgClient, args as { name: string }),
  false,
);

registerTool(
  server,
  'repo_branches',
  'List branches in a repository with their latest commit identifiers',
  repoBranchesSchema,
  async (sgClient, args) =>
    await repoBranches(sgClient, args as { repo: string; query?: string; limit?: number }),
  false,
);

registerTool(
  server,
  'file_tree',
  'Browse the directory structure of a repository at a given revision and path.',
  fileTreeSchema,
  async (sgClient, args) =>
    await fileTree(sgClient, args as { repo: string; path?: string; rev?: string }),
  false,
);

registerTool(
  server,
  'file_get',
  'Get the contents of a specific file from a repository',
  fileGetSchema,
  async (sgClient, args) =>
    await fileGet(sgClient, args as { repo: string; path: string; rev?: string }),
  false,
);

registerTool(
  server,
  'file_blame',
  'Get git blame information showing which commits last modified each line of a file',
  fileBlameSchema,
  async (sgClient, args) =>
    await fileBlame(
      sgClient,
      args as { repo: string; path: string; rev?: string; startLine?: number; endLine?: number },
    ),
  false,
);

registerTool(
  server,
  'repo_compare_commits',
  'Compare two commits/branches and show the diff',
  repoCompareCommitsSchema,
  async (sgClient, args) =>
    await repoCompareCommits(sgClient, args as { repo: string; baseRev: string; headRev: string }),
  false,
);

registerTool(
  server,
  'repo_languages',
  'Get programming language statistics for a repository',
  repoLanguagesSchema,
  async (sgClient, args) => await repoLanguages(sgClient, args as { repo: string; rev?: string }),
  false,
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write('Sourcegraph MCP Server running on stdio\n');
