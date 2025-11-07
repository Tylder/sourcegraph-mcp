#!/usr/bin/env node
/**
 * Sourcegraph MCP Server
 * Entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z, type ZodTypeAny } from 'zod';
import { getConfig, validateConfig } from './config.js';
import { SourcegraphClient } from './graphql/client.js';
import { testConnection } from './tools/util/connection.js';
import { searchCode } from './tools/search/code.js';
import { searchSymbols } from './tools/search/symbols.js';
import { repoBranches } from './tools/repos/branches.js';

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

// Register tools
server.tool(
  'connection_test',
  'Test connection to Sourcegraph and return version/user info',
  async () => {
    const result = await testConnection(sgClient);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

const searchCodeSchema: Record<string, ZodTypeAny> = {
  query: z.string().describe('The search query (e.g., "repo:myrepo function auth")'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results (default: 10)'),
};

server.tool(
  'search_code',
  'Search for code in Sourcegraph using advanced query syntax. Supports filters like repo:, lang:, file:, etc.',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchCodeSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { query, limit } = args as { query: string; limit?: number };
    const result = await searchCode(sgClient, { query, limit });

    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  }
);

const searchSymbolsSchema: Record<string, ZodTypeAny> = {
  query: z.string().describe('The search query (e.g., "repo:myrepo authenticate")'),
  types: z
    .array(z.string())
    .optional()
    .describe('Symbol types to filter (e.g., ["function", "class", "variable"])'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results (default: 10)'),
};

server.tool(
  'search_symbols',
  'Search for symbols (functions, classes, variables, etc.) in Sourcegraph',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchSymbolsSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { query, types, limit } = args as {
      query: string;
      types?: string[];
      limit?: number;
    };
    const result = await searchSymbols(sgClient, { query, types, limit });

    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  }
);

const repoBranchesSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('Full repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  query: z.string().optional().describe('Optional branch name filter (e.g., "feature/")'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of branches to return (default: 20)'),
};

server.tool(
  'repo_branches',
  'List branches in a repository with their latest commit identifiers',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repoBranchesSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { repo, query, limit } = args as {
      repo: string;
      query?: string;
      limit?: number;
    };
    const result = await repoBranches(sgClient, { repo, query, limit });

    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Sourcegraph MCP Server running on stdio');
