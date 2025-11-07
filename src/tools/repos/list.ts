/**
 * Repository list tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { REPOSITORY_LIST_QUERY } from '../../graphql/queries/repos.js';

interface RepositoryListResponse {
  repositories: {
    nodes: {
      name: string;
      url: string;
      description?: string | null;
      isPrivate: boolean;
      isFork: boolean;
      isArchived: boolean;
      mirrorInfo?: {
        cloned: boolean;
        cloneInProgress: boolean;
      } | null;
      defaultBranch?: {
        displayName: string;
      } | null;
      viewerCanAdminister: boolean;
      updatedAt: string;
    }[];
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
}

export type RepositoryOrderField =
  | 'REPOSITORY_NAME'
  | 'STARS'
  | 'UPDATED_AT'
  | 'COMMIT_DATE'
  | 'CREATED_AT';

export type OrderDirection = 'ASC' | 'DESC';

export interface RepoListParams {
  query?: string;
  first?: number;
  after?: string;
}

type RepositoryNode = RepositoryListResponse['repositories']['nodes'][number];

function buildQueryVariables(params: RepoListParams): Record<string, unknown> {
  const { query, first = 10, after } = params;

  const variables: Record<string, unknown> = { first };

  if (query) {
    variables.query = query;
  }

  if (after) {
    variables.after = after;
  }

  return variables;
}

function formatRepositoryStatus(repository: RepositoryNode): string | undefined {
  const statuses: string[] = [];

  if (repository.isPrivate) {
    statuses.push('private');
  }

  if (repository.isFork) {
    statuses.push('fork');
  }

  if (repository.isArchived) {
    statuses.push('archived');
  }

  if (repository.viewerCanAdminister) {
    statuses.push('admin');
  }

  const { mirrorInfo } = repository;
  if (mirrorInfo) {
    if (!mirrorInfo.cloned) {
      statuses.push('not cloned');
    }

    if (mirrorInfo.cloneInProgress) {
      statuses.push('cloning');
    }
  }

  return statuses.length > 0 ? `Status: ${statuses.join(', ')}` : undefined;
}

function formatRepositoryDetails(repository: RepositoryNode, index: number): string[] {
  const lines: (string | undefined)[] = [
    `Repository ${(index + 1).toString()}:`,
    `Name: ${repository.name}`,
    `URL: ${repository.url}`,
    repository.description ? `Description: ${repository.description}` : undefined,
    formatRepositoryStatus(repository),
    repository.defaultBranch?.displayName
      ? `Default Branch: ${repository.defaultBranch.displayName}`
      : undefined,
    `Updated At: ${repository.updatedAt}`,
  ];

  return lines.filter((line): line is string => line !== undefined);
}

export async function repoList(client: SourcegraphClient, params: RepoListParams): Promise<string> {
  const variables = buildQueryVariables(params);
  const requested = typeof params.first === 'number' ? params.first : 10;

  try {
    const response = await client.query<RepositoryListResponse>(REPOSITORY_LIST_QUERY, variables);
    const { repositories } = response;

    const summaryLines: string[] = [
      'Repository List',
      `Total Count: ${repositories.totalCount.toString()}`,
      `Requested: ${requested.toString()}`,
    ];

    if (params.query) {
      summaryLines.push(`Query: ${params.query}`);
    }

    summaryLines.push(`Has Next Page: ${repositories.pageInfo.hasNextPage ? 'yes' : 'no'}`);

    if (repositories.pageInfo.hasNextPage && repositories.pageInfo.endCursor) {
      summaryLines.push(`Next Page Cursor: ${repositories.pageInfo.endCursor}`);
    }

    if (repositories.nodes.length === 0) {
      summaryLines.push('', 'No repositories found.');
      return `${summaryLines.join('\n')}\n`;
    }

    repositories.nodes.forEach((repository, index) => {
      summaryLines.push('', ...formatRepositoryDetails(repository, index));
    });

    return `${summaryLines.join('\n')}\n`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error listing repositories: ${message}`;
  }
}
