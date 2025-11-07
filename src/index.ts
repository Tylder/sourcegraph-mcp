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
import { getUserInfo } from './tools/util/user_info.js';
import { searchCode } from './tools/search/code.js';
import { searchSymbols } from './tools/search/symbols.js';
import { searchCommits } from './tools/search/commits.js';
import { repoList } from './tools/repos/list.js';
import { repoInfo } from './tools/repos/info.js';
import { repoBranches } from './tools/repos/branches.js';
import { fileTree } from './tools/files/tree.js';
import { fileGet } from './tools/files/get.js';
import { fileBlame } from './tools/files/blame.js';
import { repoCompareCommits } from './tools/repos/repo_compare_commits.js';
import { repoLanguages } from './tools/repos/repo_languages.js';

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
  'user_info',
  "Return the current Sourcegraph user's username, email, and organizations",
  async () => {
    try {
      const userInfo = await getUserInfo(sgClient);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(userInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error fetching user info: ${message}`,
          },
        ],
      };
    }
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

const repoListSchema: Record<string, ZodTypeAny> = {
  query: z.string().optional().describe('Filter repositories by name or pattern'),
  first: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of repositories (default: 20)'),
};

server.tool(
  'repo_list',
  'List repositories available on Sourcegraph with optional filtering',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repoListSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { query, first } = args as { query?: string; first?: number };
    const result = await repoList(sgClient, { query, first });

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

const repoInfoSchema: Record<string, ZodTypeAny> = {
  name: z
    .string()
    .min(1)
    .describe('Full repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
};

server.tool(
  'repo_info',
  'Get detailed information about a Sourcegraph repository including clone status and metadata',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repoInfoSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { name } = args as { name: string };
    const result = await repoInfo(sgClient, { name });

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

const fileTreeSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('The repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  path: z.string().optional().describe('Directory path within the repository (default: root)'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

server.tool(
  'file_tree',
  'Browse the directory structure of a repository at a given revision and path.',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileTreeSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { repo, path, rev } = args as { repo: string; path?: string; rev?: string };
    const result = await fileTree(sgClient, { repo, path, rev });

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

const fileGetSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('The repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  path: z.string().describe('File path within the repository (e.g., "src/index.ts")'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

server.tool(
  'file_get',
  'Get the contents of a specific file from a repository',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileGetSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { repo, path, rev } = args as { repo: string; path: string; rev?: string };
    const result = await fileGet(sgClient, { repo, path, rev });

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

const fileBlameSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('The repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  path: z.string().describe('File path within the repository (e.g., "src/index.ts")'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

server.tool(
  'file_blame',
  'Get git blame information showing which commits last modified each line of a file',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileBlameSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { repo, path, rev } = args as { repo: string; path: string; rev?: string };
    const typedFileBlame = fileBlame as (
      client: SourcegraphClient,
      variables: { repo: string; path: string; rev?: string }
    ) => Promise<string>;
    const result = await typedFileBlame(sgClient, { repo, path, rev });

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

const repoCompareCommitsSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('Repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  baseRev: z.string().describe('Base revision/branch/commit'),
  headRev: z.string().describe('Head revision/branch/commit to compare'),
};

server.tool(
  'repo_compare_commits',
  'Compare two commits/branches and show the diff',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repoCompareCommitsSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { repo, baseRev, headRev } = args as { repo: string; baseRev: string; headRev: string };
    const result = await repoCompareCommits(sgClient, { repo, baseRev, headRev });

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

const repoLanguagesSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('Repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

server.tool(
  'repo_languages',
  'Get programming language statistics for a repository',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repoLanguagesSchema as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (args: any) => {
    const { repo, rev } = args as { repo: string; rev?: string };
    const result = await repoLanguages(sgClient, { repo, rev });

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
