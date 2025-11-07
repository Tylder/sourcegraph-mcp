import { z, type ZodTypeAny } from 'zod';

/**
 * Zod validation schemas for all MCP tool parameters
 *
 * These schemas define the expected input parameters for each tool,
 * providing runtime validation and type safety.
 */

export const searchCodeSchema: Record<string, ZodTypeAny> = {
  query: z.string().describe('The search query (e.g., "repo:myrepo function auth")'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results (default: 10)'),
};

export const searchSymbolsSchema: Record<string, ZodTypeAny> = {
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

export const searchCommitsSchema: Record<string, ZodTypeAny> = {
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

export const repoListSchema: Record<string, ZodTypeAny> = {
  query: z.string().optional().describe('Filter repositories by name or pattern'),
  first: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of repositories (default: 20)'),
};

export const repoInfoSchema: Record<string, ZodTypeAny> = {
  name: z
    .string()
    .min(1)
    .describe('Full repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
};

export const repoBranchesSchema: Record<string, ZodTypeAny> = {
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

export const fileTreeSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('The repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  path: z.string().optional().describe('Directory path within the repository (default: root)'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

export const fileGetSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('The repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  path: z.string().describe('File path within the repository (e.g., "src/index.ts")'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

export const fileBlameSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('The repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  path: z.string().describe('File path within the repository (e.g., "src/index.ts")'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};

export const repoCompareCommitsSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('Repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  baseRev: z.string().describe('Base revision/branch/commit'),
  headRev: z.string().describe('Head revision/branch/commit to compare'),
};

export const repoLanguagesSchema: Record<string, ZodTypeAny> = {
  repo: z.string().describe('Repository name (e.g., "github.com/sourcegraph/sourcegraph")'),
  rev: z.string().optional().describe('Repository revision/branch (default: HEAD)'),
};
