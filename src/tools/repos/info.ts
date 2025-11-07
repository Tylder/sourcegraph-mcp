import type { SourcegraphClient } from '../../graphql/client.js';
import { REPO_INFO_QUERY } from '../../graphql/queries/repos.js';

interface RepoInfoResponse {
  repository: {
    name: string;
    description?: string | null;
    url: string;
    isPrivate: boolean;
    isFork: boolean;
    isArchived: boolean;
    viewerPermission?: string | null;
    mirrorInfo?: {
      cloned: boolean;
      cloneInProgress: boolean;
      cloneProgress?: string | null;
    } | null;
    defaultBranch?: {
      displayName?: string | null;
    } | null;
    diskUsage?: number | null;
    updatedAt?: string | null;
  } | null;
}

/**
 * Parameters accepted by the {@link repoInfo} tool.
 */
export interface RepoInfoParams {
  /** Full repository name (for example, `github.com/sourcegraph/sourcegraph`). */
  name: string;
}

function formatCloneStatus(response: RepoInfoResponse['repository']): string {
  const mirrorInfo = response?.mirrorInfo;

  if (!mirrorInfo) {
    return 'Unknown';
  }

  if (mirrorInfo.cloned) {
    return 'Cloned';
  }

  if (mirrorInfo.cloneInProgress) {
    const progress = mirrorInfo.cloneProgress ?? 'in progress';
    return `Cloning (${progress})`;
  }

  return 'Not cloned';
}

function formatDiskUsage(diskUsage?: number | null): string | null {
  if (diskUsage === null || diskUsage === undefined) {
    return null;
  }

  const megabytes = diskUsage / (1024 * 1024);
  return `${megabytes.toFixed(2)} MB`;
}

/**
 * Fetches rich metadata about a Sourcegraph repository and formats it for MCP responses.
 *
 * @param client - Configured Sourcegraph GraphQL client used to execute the query.
 * @param params - {@link RepoInfoParams} describing the repository to inspect.
 * @returns A formatted string suitable for MCP textual responses containing repository metadata.
 *
 * @example
 * ```ts
 * await repoInfo(client, { name: 'github.com/sourcegraph/sourcegraph' });
 * ```
 *
 * @remarks
 * - GraphQL query: {@link REPO_INFO_QUERY}
 * - Error handling: returns a descriptive string when the repository is missing or when the GraphQL request fails.
 */
export async function repoInfo(client: SourcegraphClient, params: RepoInfoParams): Promise<string> {
  const { name } = params;

  try {
    const response = await client.query<RepoInfoResponse>(REPO_INFO_QUERY, { name });
    const repository = response.repository;

    if (!repository) {
      return `Repository not found: ${name}`;
    }

    let output = `Repository: ${repository.name}\n`;
    output += `URL: ${repository.url}\n`;

    const description = repository.description?.trim();
    output += `Description: ${description && description.length > 0 ? description : 'No description provided.'}\n`;

    output += `Default Branch: ${repository.defaultBranch?.displayName ?? 'Not set'}\n`;
    output += `Visibility: ${repository.isPrivate ? 'Private' : 'Public'}\n`;
    output += `Fork: ${repository.isFork ? 'Yes' : 'No'}\n`;
    output += `Archived: ${repository.isArchived ? 'Yes' : 'No'}\n`;
    output += `Clone Status: ${formatCloneStatus(repository)}\n`;

    const stats: string[] = [];
    const diskUsage = formatDiskUsage(repository.diskUsage);

    if (diskUsage) {
      stats.push(`Disk Usage: ${diskUsage}`);
    }

    if (repository.viewerPermission) {
      stats.push(`Viewer Permission: ${repository.viewerPermission}`);
    }

    if (repository.updatedAt) {
      stats.push(`Last Updated: ${repository.updatedAt}`);
    }

    if (stats.length > 0) {
      output += '\nRepository Stats:\n';
      stats.forEach((stat) => {
        output += `- ${stat}\n`;
      });
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching repository info: ${message}`;
  }
}
