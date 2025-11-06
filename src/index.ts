#!/usr/bin/env node
/**
 * Sourcegraph MCP Server
 * Entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig, validateConfig } from './config.js';
import { SourcegraphClient } from './graphql/client.js';
import { testConnection } from './tools/util/connection.js';

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

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Sourcegraph MCP Server running on stdio');
