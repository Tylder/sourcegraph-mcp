/**
 * Repository list tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { REPOSITORY_LIST_QUERY } from '../../graphql/queries/repos.js';

interface RepositoryListResponse {
  repositories: {
    nodes: RepositoryNode[];
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
}

interface RepositoryNode {
  name: string;
  url: string;
  description?: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  viewerCanAdminister: boolean;
  mirrorInfo?: {
    cloned: boolean;
    cloneInProgress: boolean;
  } | null;
  defaultBranch?: {
    displayName?: string | null;
  } | null;
  updatedAt: string;
}

export type RepositoryOrderField =
  | 'REPOSITORY_NAME'
  | 'STARS'
  | 'UPDATED_AT'
  | 'COMMIT_DATE'
  | 'CREATED_AT';

export type OrderDirection = 'ASC' | 'DESC';

export interface RepoListOrderBy {
  field?: RepositoryOrderField;
  direction?: OrderDirection;
}

export interface RepoListParams {
  query?: string;
  first?: number;
  after?: string;
  orderBy?: RepoListOrderBy;
}

interface RepositoryListVariables {
  first: number;
  query?: string;
  after?: string;
  orderBy: {
    field: RepositoryOrderField;
    direction: OrderDirection;
  };
}

type RepositoryListQueryVariables = RepositoryListVariables & Record<string, unknown>;

const DEFAULT_FIRST = 20;
const DEFAULT_ORDER_FIELD: RepositoryOrderField = 'REPOSITORY_NAME';
const DEFAULT_ORDER_DIRECTION: OrderDirection = 'ASC';

function buildQueryVariables(params: RepoListParams): RepositoryListQueryVariables {
  const trimmedQuery = params.query?.trim();

  const variables: RepositoryListQueryVariables = {
    first: params.first ?? DEFAULT_FIRST,
    orderBy: {
      field: params.orderBy?.field ?? DEFAULT_ORDER_FIELD,
      direction: params.orderBy?.direction ?? DEFAULT_ORDER_DIRECTION,
    },
  };

  if (typeof trimmedQuery === 'string' && trimmedQuery.length > 0) {
    variables.query = trimmedQuery;
  }

  if (typeof params.after === 'string' && params.after.length > 0) {
    variables.after = params.after;
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
  if (mirrorInfo != null) {
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
    typeof repository.description === 'string' && repository.description.length > 0
      ? `Description: ${repository.description}`
      : undefined,
    formatRepositoryStatus(repository),
    (() => {
      const displayName = repository.defaultBranch?.displayName;
      return typeof displayName === 'string' && displayName.length > 0
        ? `Default Branch: ${displayName}`
        : undefined;
    })(),
    `Updated At: ${repository.updatedAt}`,
  ];

  return lines.filter((line): line is string => line !== undefined);
}

export async function repoList(client: SourcegraphClient, params: RepoListParams): Promise<string> {
  const variables = buildQueryVariables(params);
  const requested = params.first ?? DEFAULT_FIRST;

  try {
    const response = await client.query<RepositoryListResponse>(REPOSITORY_LIST_QUERY, variables);
    const { repositories } = response;

    const summaryLines: string[] = [
      'Repository List',
      `Total Count: ${repositories.totalCount.toString()}`,
      `Requested: ${requested.toString()}`,
      `Has Next Page: ${repositories.pageInfo.hasNextPage ? 'yes' : 'no'}`,
      `Order: ${variables.orderBy.field} (${variables.orderBy.direction})`,
    ];

    if (typeof variables.query === 'string' && variables.query.length > 0) {
      summaryLines.splice(3, 0, `Query: ${variables.query}`);
    }

    if (typeof variables.after === 'string' && variables.after.length > 0) {
      summaryLines.push(`Starting Cursor: ${variables.after}`);
    }

    if (
      repositories.pageInfo.hasNextPage &&
      typeof repositories.pageInfo.endCursor === 'string' &&
      repositories.pageInfo.endCursor.length > 0
    ) {
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
