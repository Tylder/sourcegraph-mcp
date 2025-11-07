/**
 * Repository branches tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { REPO_BRANCHES_QUERY } from '../../graphql/queries/repos.js';

interface RepoBranchesResponse {
  repository: {
    name: string;
    url: string;
    defaultBranch?: {
      displayName?: string;
    } | null;
    branches?: {
      nodes: {
        name?: string | null;
        displayName?: string | null;
        abbreviatedName?: string | null;
        url?: string | null;
        target?: {
          oid?: string | null;
          abbreviatedOID?: string | null;
        } | null;
      }[];
      pageInfo: {
        hasNextPage: boolean;
      };
    } | null;
  } | null;
}

export interface RepoBranchesParams {
  repo: string;
  query?: string;
  limit?: number;
}

export async function repoBranches(
  client: SourcegraphClient,
  params: RepoBranchesParams
): Promise<string> {
  const { repo, limit = 20 } = params;
  const trimmedQuery = params.query?.trim();

  try {
    const variables: {
      name: string;
      first: number;
      query?: string;
    } = {
      name: repo,
      first: limit,
    };

    if (trimmedQuery) {
      variables.query = trimmedQuery;
    }

    const response = await client.query<RepoBranchesResponse>(REPO_BRANCHES_QUERY, variables);

    if (!response.repository) {
      return `Repository not found: ${repo}`;
    }

    const { name, url, defaultBranch, branches } = response.repository;
    const branchNodes = branches?.nodes ?? [];

    let output = `Repository: ${name}\n`;
    output += `URL: ${url}\n`;

    if (defaultBranch?.displayName) {
      output += `Default Branch: ${defaultBranch.displayName}\n`;
    }

    if (trimmedQuery) {
      output += `Filter: ${trimmedQuery}\n`;
    }

    output += `Returned Branches: ${branchNodes.length.toString()}\n\n`;

    if (branchNodes.length === 0) {
      output += 'No branches found.\n';
      if (trimmedQuery) {
        output += 'Try adjusting your filter or increasing the limit.';
      }
      return output;
    }

    branchNodes.forEach((branch, index) => {
      const branchLabel =
        branch.displayName?.trim() ??
        branch.abbreviatedName?.trim() ??
        branch.name?.trim() ??
        'unknown';
      output += `Branch ${(index + 1).toString()}: ${branchLabel}\n`;

      if (branch.name) {
        output += `  Name: ${branch.name}\n`;
      }

      if (branch.abbreviatedName) {
        output += `  Abbreviated: ${branch.abbreviatedName}\n`;
      }

      const targetOid = branch.target?.abbreviatedOID ?? branch.target?.oid;
      if (targetOid) {
        output += `  Target: ${targetOid}\n`;
      }

      if (branch.url) {
        output += `  URL: ${branch.url}\n`;
      }

      output += '\n';
    });

    if (branches?.pageInfo.hasNextPage) {
      output += `Note: Additional branches available beyond the ${limit.toString()} shown.\n`;
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching branches: ${message}`;
  }
}
