#!/usr/bin/env node
/**
 * Sourcegraph MCP Server
 * Entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getConfig, validateConfig } from './config.js';
import { SourcegraphClient } from './graphql/client.js';
import { testConnection } from './tools/util/connection.js';
import { searchCode } from './tools/search/code.js';
import { searchSymbols } from './tools/search/symbols.js';

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

server.tool(
  'search_code',
  'Search for code in Sourcegraph using advanced query syntax. Supports filters like repo:, lang:, file:, etc.',
  {
    query: z.string().describe('The search query (e.g., "repo:myrepo function auth")'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of results (default: 10)'),
  },
  async (args) => {
    const { query, limit } = args as { query: string; limit?: number };
    const result = await searchCode(sgClient, { query, limit });

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }
);

server.tool(
  'search_symbols',
  'Search for symbols (functions, classes, variables, etc.) in Sourcegraph',
  {
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
  },
  async (args) => {
    const { query, types, limit } = args as {
      query: string;
      types?: string[];
      limit?: number;
    };
    const result = await searchSymbols(sgClient, { query, types, limit });

    return {
      content: [
        {
          type: 'text',
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
