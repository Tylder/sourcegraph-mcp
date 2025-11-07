/**
 * Repository branches tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { REPO_BRANCHES_QUERY } from '../../graphql/queries/repos.js';

interface BranchTarget {
  oid?: string | null;
  abbreviatedOID?: string | null;
}

interface BranchNode {
  name?: string | null;
  displayName?: string | null;
  abbrevName?: string | null;
  abbreviatedName?: string | null;
  url?: string | null;
  target?: BranchTarget | null;
}

interface BranchConnection {
  nodes?: (BranchNode | null)[] | null;
  pageInfo?: {
    hasNextPage: boolean;
    endCursor?: string | null;
  } | null;
}

interface RepoBranchesResponse {
  repository: {
    name: string;
    url: string;
    defaultBranch?: {
      displayName?: string | null;
    } | null;
    branches?: BranchConnection | null;
  } | null;
}

export interface RepoBranchesParams {
  repo: string;
  query?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_PAGE_SIZE = 50;

export async function repoBranches(
  client: SourcegraphClient,
  params: RepoBranchesParams
): Promise<string> {
  const { repo } = params;
  const trimmedQuery = params.query?.trim();
  const requestedLimit = params.limit ?? DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));

  try {
    const branches: BranchNode[] = [];
    let afterCursor: string | undefined;
    let repositoryInfo: RepoBranchesResponse['repository'] | null = null;
    let moreAvailable = false;

    while (branches.length < limit) {
      const pageSize = Math.min(limit - branches.length, MAX_PAGE_SIZE);
      const variables: {
        name: string;
        first: number;
        query?: string;
        after?: string;
      } = {
        name: repo,
        first: pageSize,
      };

      if (trimmedQuery) {
        variables.query = trimmedQuery;
      }

      if (afterCursor) {
        variables.after = afterCursor;
      }

      const response = await client.query<RepoBranchesResponse>(REPO_BRANCHES_QUERY, variables);

      if (!response.repository) {
        repositoryInfo = null;
        break;
      }

      repositoryInfo ??= response.repository;

      const branchConnection = response.repository.branches;
      const rawNodes = branchConnection?.nodes ?? [];
      const pageNodes = rawNodes.filter((node): node is BranchNode => node != null);
      branches.push(...pageNodes);

      const hasNextPage = branchConnection?.pageInfo?.hasNextPage ?? false;
      const endCursor = branchConnection?.pageInfo?.endCursor ?? undefined;

      if (branches.length >= limit) {
        moreAvailable = hasNextPage;
        break;
      }

      if (hasNextPage && endCursor) {
        afterCursor = endCursor;
        moreAvailable = true;
      } else {
        moreAvailable = false;
        break;
      }
    }

    if (!repositoryInfo) {
      return `Repository not found: ${repo}`;
    }

    const branchNodes = branches.slice(0, limit);

    let output = `Repository: ${repositoryInfo.name}\n`;
    output += `URL: ${repositoryInfo.url}\n`;

    const defaultBranchName = repositoryInfo.defaultBranch?.displayName;
    if (defaultBranchName) {
      output += `Default Branch: ${defaultBranchName}\n`;
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
      const abbreviatedName = branch.abbrevName ?? branch.abbreviatedName;
      const branchLabel =
        branch.displayName?.trim() ?? abbreviatedName?.trim() ?? branch.name?.trim() ?? 'unknown';

      output += `Branch ${(index + 1).toString()}: ${branchLabel}\n`;

      if (branch.name) {
        output += `  Name: ${branch.name}\n`;
      }

      if (abbreviatedName) {
        output += `  Abbreviated: ${abbreviatedName}\n`;
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

    if (moreAvailable) {
      output += `Note: Additional branches available beyond the ${limit.toString()} shown.\n`;
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching branches: ${message}`;
  }
}
