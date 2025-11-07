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
    viewerCanAdminister?: boolean | null;
    diskUsage?: number | null;
    mirrorInfo?: MirrorInfo | null;
    defaultBranch?: {
      displayName?: string | null;
    } | null;
    updatedAt?: string | null;
  } | null;
}

type MirrorInfo =
  | {
      cloned: boolean;
      cloneInProgress: boolean;
      cloneProgress?: string | null;
    }
  | null
  | undefined;

export interface RepoInfoParams {
  name: string;
}

export type RepoCloneStatus =
  | { state: 'CLONED' }
  | { state: 'CLONING'; progress?: string }
  | { state: 'NOT_CLONED' }
  | { state: 'UNKNOWN' };

export interface RepoInfoStats {
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  viewerCanAdminister?: boolean;
  diskUsage?: number;
  updatedAt?: string | null;
}

export interface RepoInfoResult {
  name: string;
  description: string | null;
  url: string;
  defaultBranch: string | null;
  cloneStatus: RepoCloneStatus;
  stats: RepoInfoStats;
}

function deriveCloneStatus(mirrorInfo: MirrorInfo): RepoCloneStatus {
  if (mirrorInfo === null || mirrorInfo === undefined) {
    return { state: 'UNKNOWN' };
  }

  if (mirrorInfo.cloned) {
    return { state: 'CLONED' };
  }

  if (mirrorInfo.cloneInProgress) {
    const progress = mirrorInfo.cloneProgress?.trim();
    return {
      state: 'CLONING',
      progress: typeof progress === 'string' && progress.length > 0 ? progress : undefined,
    };
  }

  return { state: 'NOT_CLONED' };
}

function normalizeDescription(description: string | null | undefined): string | null {
  if (description === null || description === undefined) {
    return null;
  }

  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatCloneStatus(status: RepoCloneStatus): string {
  switch (status.state) {
    case 'CLONED':
      return 'Cloned';
    case 'CLONING': {
      const progress = status.progress?.trim();
      return `Cloning (${typeof progress === 'string' && progress.length > 0 ? progress : 'in progress'})`;
    }
    case 'NOT_CLONED':
      return 'Not cloned';
    case 'UNKNOWN':
      return 'Unknown';
    default:
      return 'Unknown';
  }
}

export function formatRepoInfo(result: RepoInfoResult): string {
  const lines: string[] = [
    `Repository: ${result.name}`,
    `URL: ${result.url}`,
    `Description: ${result.description ?? 'No description provided.'}`,
    `Default Branch: ${result.defaultBranch ?? 'Not set'}`,
    `Visibility: ${result.stats.isPrivate ? 'Private' : 'Public'}`,
    `Fork: ${result.stats.isFork ? 'Yes' : 'No'}`,
    `Archived: ${result.stats.isArchived ? 'Yes' : 'No'}`,
    `Clone Status: ${formatCloneStatus(result.cloneStatus)}`,
  ];

  const statsDetails: string[] = [];

  if (typeof result.stats.viewerCanAdminister === 'boolean') {
    statsDetails.push(`Can Administer: ${result.stats.viewerCanAdminister ? 'Yes' : 'No'}`);
  }

  if (typeof result.stats.diskUsage === 'number') {
    statsDetails.push(`Disk Usage: ${result.stats.diskUsage.toString()} KB`);
  }

  if (typeof result.stats.updatedAt === 'string' && result.stats.updatedAt.length > 0) {
    statsDetails.push(`Last Updated: ${result.stats.updatedAt}`);
  }

  if (statsDetails.length > 0) {
    lines.push('', 'Repository Stats:');
    for (const stat of statsDetails) {
      lines.push(`- ${stat}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function repoInfo(
  client: SourcegraphClient,
  params: RepoInfoParams,
): Promise<RepoInfoResult> {
  let response: RepoInfoResponse;

  try {
    response = await client.query<RepoInfoResponse>(REPO_INFO_QUERY, {
      name: params.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Error fetching repository info: ${message}`);
  }

  if (response.repository === null) {
    throw new Error(`Repository not found: ${params.name}`);
  }

  const { repository } = response;

  return {
    name: repository.name,
    description: normalizeDescription(repository.description),
    url: repository.url,
    defaultBranch: repository.defaultBranch?.displayName ?? null,
    cloneStatus: deriveCloneStatus(repository.mirrorInfo ?? undefined),
    stats: {
      isPrivate: repository.isPrivate,
      isFork: repository.isFork,
      isArchived: repository.isArchived,
      viewerCanAdminister:
        typeof repository.viewerCanAdminister === 'boolean'
          ? repository.viewerCanAdminister
          : undefined,
      diskUsage: typeof repository.diskUsage === 'number' ? repository.diskUsage : undefined,
      updatedAt: repository.updatedAt ?? null,
    },
  };
}
