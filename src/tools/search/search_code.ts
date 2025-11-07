/**
 * Code search tool handler that returns structured results for AI consumption.
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { CODE_SEARCH_QUERY } from '../../graphql/queries/search.js';
import type {
  SearchCodeParams,
  SearchCodeResult,
  SearchCodeFileMatch,
  SearchCodeCommitMatch,
  SearchCodeRepositoryMatch,
  SearchCodeLineMatch,
  SearchVersion,
} from './search_code.types.js';
import {
  isCommitMatchResult,
  isFileMatchResult,
  isRepositoryMatchResult,
  type GraphQLCommitMatch,
  type GraphQLFileMatch,
  type GraphQLLineMatch,
  type GraphQLSearchResponse,
} from './search_code.graphql.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 500;
const COUNT_FILTER_REGEX = /\bcount:\d+\b/i;
const TIMEOUT_FILTER_REGEX = /\btimeout:[^\s]+/i;
const DEFAULT_VERSION: SearchVersion = 'V3';

const normaliseLimit = (limit: number | undefined): number => {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  const integer = Math.trunc(limit);
  if (Number.isNaN(integer) || integer <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(integer, 1), MAX_LIMIT);
};

const formatTimeoutFilter = (timeout: number | undefined, query: string): string | undefined => {
  if (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0) {
    return undefined;
  }

  if (TIMEOUT_FILTER_REGEX.test(query)) {
    return undefined;
  }

  const rounded = Math.round(timeout);
  if (rounded <= 0) {
    return undefined;
  }

  if (rounded % 1000 === 0) {
    return `timeout:${Math.max(1, Math.floor(rounded / 1000)).toString()}s`;
  }

  return `timeout:${Math.max(1, rounded).toString()}ms`;
};

const buildSearchQuery = (query: string, limit: number, timeout: number | undefined): string => {
  const segments = [query];

  if (!COUNT_FILTER_REGEX.test(query)) {
    segments.push(`count:${limit.toString()}`);
  }

  const timeoutFilter = formatTimeoutFilter(timeout, query);
  if (timeoutFilter) {
    segments.push(timeoutFilter);
  }

  return segments.join(' ');
};

const ensureQuery = (rawQuery: string): string => {
  const trimmed = rawQuery.trim();

  if (!trimmed) {
    throw new Error('Search query must not be empty.');
  }

  return trimmed;
};

const mapLineMatches = (
  matches: readonly GraphQLLineMatch[] | null | undefined
): SearchCodeLineMatch[] => {
  if (!matches || matches.length === 0) {
    return [];
  }

  return matches.map((match) => ({
    lineNumber: match.lineNumber,
    preview: match.preview ?? '',
    offsets: match.offsetAndLengths?.map((tuple) => [tuple[0], tuple[1]] as [number, number]) ?? [],
  }));
};

const mapFileMatch = (result: GraphQLFileMatch): SearchCodeFileMatch | null => {
  const repository = result.repository;
  const file = result.file;

  if (!repository || !file) {
    return null;
  }

  return {
    repository: repository.name,
    repositoryUrl: repository.url,
    path: file.path,
    url: file.url,
    lineMatches: mapLineMatches(result.lineMatches),
  };
};

const mapCommitMatch = (result: GraphQLCommitMatch): SearchCodeCommitMatch | null => {
  const commit = result.commit;

  if (!commit) {
    return null;
  }

  return {
    repository: commit.repository?.name ?? 'unknown',
    repositoryUrl: commit.repository?.url ?? undefined,
    oid: commit.oid,
    abbreviatedOID: commit.abbreviatedOID ?? undefined,
    url: commit.url,
    subject: commit.subject ?? undefined,
    messagePreview: result.messagePreview?.value?.trim() ?? undefined,
  };
};

/**
 * Execute a Sourcegraph code search and return structured results.
 */
export async function searchCode(
  client: SourcegraphClient,
  params: SearchCodeParams
): Promise<SearchCodeResult> {
  const query = ensureQuery(params.query);
  const limit = normaliseLimit(params.limit);
  const version = params.version ?? DEFAULT_VERSION;
  const executedQuery = buildSearchQuery(query, limit, params.timeout);

  try {
    const response = await client.query<GraphQLSearchResponse>(CODE_SEARCH_QUERY as string, {
      query: executedQuery,
      version,
    });

    const results = response.search.results;

    const fileMatches: SearchCodeFileMatch[] = [];
    const repositoryMatches: SearchCodeRepositoryMatch[] = [];
    const commitMatches: SearchCodeCommitMatch[] = [];

    for (const result of results.results) {
      if (isFileMatchResult(result)) {
        const mapped = mapFileMatch(result);
        if (mapped) {
          fileMatches.push(mapped);
        }
        continue;
      }

      if (isRepositoryMatchResult(result)) {
        repositoryMatches.push({
          name: result.name,
          url: result.url,
          description: result.description ?? undefined,
        });
        continue;
      }

      if (isCommitMatchResult(result)) {
        const mapped = mapCommitMatch(result);
        if (mapped) {
          commitMatches.push(mapped);
        }
      }
    }

    return {
      query,
      executedQuery,
      limit,
      version,
      matchCount: results.matchCount,
      approximateResultCount: results.approximateResultCount,
      limitHit: results.limitHit,
      dynamicFilters: (results.dynamicFilters ?? []).map((filter) => ({
        value: filter.value,
        label: filter.label,
        count: filter.count,
        kind: filter.kind,
      })),
      fileMatches,
      repositoryMatches,
      commitMatches,
      status: {
        cloning: (results.cloning ?? []).map((repo) => repo.name),
        timedout: (results.timedout ?? []).map((repo) => repo.name),
        missing: (results.missing ?? []).map((repo) => ({
          name: repo.name,
          reason: repo.reason ?? undefined,
          url: repo.url ?? undefined,
        })),
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Code search failed: ${error.message}`);
    }

    throw new Error(`Code search failed: ${String(error)}`);
  }
}

export type {
  SearchCodeParams,
  SearchCodeResult,
  SearchCodeFileMatch,
  SearchCodeCommitMatch,
  SearchCodeRepositoryMatch,
  SearchCodeLineMatch,
  SearchVersion,
  SearchCodeFilter,
  SearchCodeMissingRepo,
} from './search_code.types.js';
