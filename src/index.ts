#!/usr/bin/env node
/**
 * Sourcegraph MCP Server
 * Entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'Sourcegraph MCP Server',
  version: '0.1.0',
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Sourcegraph MCP Server running');
