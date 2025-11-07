/**
 * Commit search tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { COMMIT_SEARCH_QUERY } from '../../graphql/queries/search.js';

interface HighlightedString {
  value: string;
}

interface CommitSearchResponse {
  search: {
    results: {
      results: {
        __typename: string;
        commit?: {
          repository?: {
            name: string;
            url: string;
          };
          oid: string;
          abbreviatedOID?: string;
          url: string;
          subject?: string;
          body?: string | null;
          author?: {
            person?: {
              displayName?: string | null;
              email?: string | null;
            } | null;
            date?: string | null;
          } | null;
        };
        messagePreview?: HighlightedString | null;
        diffPreview?: HighlightedString | null;
      }[];
      matchCount: number;
      limitHit: boolean;
    };
  };
}

export interface SearchCommitsParams {
  query: string;
  author?: string;
  after?: string;
  before?: string;
  limit?: number;
}

const quoteIfNeeded = (value: string): string => {
  const trimmed = value.trim();
  const escaped = trimmed.replace(/"/g, '\\"');
  return trimmed.includes(' ') ? `"${escaped}"` : escaped;
};

const hasFilterValue = (value: string | undefined): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
};

const stripHtmlTags = (value: string): string => {
  return value.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '');
};

const formatHighlightedValue = (highlight?: HighlightedString | null): string | null => {
  if (highlight == null || typeof highlight.value !== 'string') {
    return null;
  }

  const normalized = decodeHtmlEntities(stripHtmlTags(highlight.value)).replace(/\u00a0/g, ' ');
  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function searchCommits(
  client: SourcegraphClient,
  params: SearchCommitsParams,
): Promise<string> {
  const { query, author, after, before, limit = 20 } = params;

  const filters: string[] = [];

  if (hasFilterValue(author)) {
    filters.push(`author:${quoteIfNeeded(author)}`);
  }

  if (hasFilterValue(after)) {
    filters.push(`after:${quoteIfNeeded(after)}`);
  }

  if (hasFilterValue(before)) {
    filters.push(`before:${quoteIfNeeded(before)}`);
  }

  const searchQuery = ['type:commit', query, ...filters, `count:${limit.toString()}`]
    .filter((segment) => segment.trim().length > 0)
    .join(' ');

  try {
    const response = await client.query<CommitSearchResponse>(COMMIT_SEARCH_QUERY, {
      query: searchQuery,
    });

    const { results } = response.search;

    const output: string[] = [];
    output.push(`Search Query: ${query}`);

    if (hasFilterValue(author)) {
      output.push(`Author Filter: ${author.trim()}`);
    }

    if (hasFilterValue(after)) {
      output.push(`After: ${after.trim()}`);
    }

    if (hasFilterValue(before)) {
      output.push(`Before: ${before.trim()}`);
    }

    output.push(`Result Count: ${results.matchCount.toString()}`);
    output.push('');

    if (results.limitHit) {
      output.push(`Note: Result limit hit, showing first ${limit.toString()} commits`);
      output.push('');
    }

    let displayedResults = 0;

    results.results.forEach((result) => {
      if (result.__typename !== 'CommitSearchResult' || result.commit == null) {
        return;
      }

      const { commit } = result;
      const repository = commit.repository?.name ?? 'Unknown repository';
      const commitId = commit.abbreviatedOID ?? commit.oid;
      const authorDisplayName = commit.author?.person?.displayName?.trim();
      const authorEmail = commit.author?.person?.email?.trim();
      const authorName =
        (typeof authorDisplayName === 'string' && authorDisplayName.length > 0
          ? authorDisplayName
          : typeof authorEmail === 'string' && authorEmail.length > 0
            ? authorEmail
            : undefined) ?? 'Unknown author';
      const authorDateValue = commit.author?.date?.trim();
      const authorDate =
        typeof authorDateValue === 'string' && authorDateValue.length > 0
          ? authorDateValue
          : 'Unknown date';
      const subjectValue = commit.subject?.trim();
      const subject =
        typeof subjectValue === 'string' && subjectValue.length > 0 ? subjectValue : '(no subject)';

      displayedResults += 1;
      output.push(`Result ${displayedResults.toString()}:`);
      output.push(`Repository: ${repository}`);
      output.push(`Commit: ${commitId}`);
      output.push(`URL: ${commit.url}`);
      output.push(`Author: ${authorName}`);
      output.push(`Date: ${authorDate}`);
      output.push(`Subject: ${subject}`);

      const body = commit.body?.trim();
      if (typeof body === 'string' && body.length > 0) {
        output.push('Body:');
        output.push(body);
      }

      const messagePreview = formatHighlightedValue(result.messagePreview);
      if (typeof messagePreview === 'string' && messagePreview.length > 0) {
        output.push('Message Preview:');
        output.push(messagePreview);
      }

      const diffPreview = formatHighlightedValue(result.diffPreview);
      if (typeof diffPreview === 'string' && diffPreview.length > 0) {
        output.push('Diff Preview:');
        output.push(diffPreview);
      }

      output.push('');
    });

    if (displayedResults === 0) {
      output.push('No commits found.');
    }

    return `${output.join('\n')}\n`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error searching commits: ${message}`;
  }
}
