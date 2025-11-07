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
import { searchCommits } from './tools/search/commits.js';

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

const searchCommitsSchema: Record<string, ZodTypeAny> = {
  query: z.string().describe('Commit search query (e.g., "repo:myrepo fix bug")'),
  author: z.string().optional().describe('Filter by commit author (name or email)'),
  after: z.string().optional().describe('Filter commits after this date (e.g., "2024-01-01")'),
  before: z.string().optional().describe('Filter commits before this date (e.g., "2024-02-01")'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of commits (default: 20)'),
};

server.tool(
  'search_commits',
  'Search git commit messages and diffs in Sourcegraph',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchCommitsSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { query, author, after, before, limit } = args as {
      query: string;
      author?: string;
      after?: string;
      before?: string;
      limit?: number;
    };

    const result = await searchCommits(sgClient, {
      query,
      author,
      after,
      before,
      limit,
    });

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
