/**
 * Code search tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { SEARCH_QUERY } from '../../graphql/queries/search.js';

interface SearchResponse {
  search: {
    results: {
      results: {
        __typename: string;
        file?: {
          path: string;
          url: string;
          content?: string;
        };
        repository?: {
          name: string;
          url: string;
        };
        lineMatches?: {
          lineNumber: number;
          offsetAndLengths: [number, number][];
          preview: string;
        }[];
      }[];
      matchCount: number;
      limitHit: boolean;
      cloning?: { name: string }[];
      timedout?: { name: string }[];
    };
  };
}

export interface SearchCodeParams {
  query: string;
  limit?: number;
}

/**
 * Search for code across repositories using Sourcegraph's advanced search syntax
 * @param client - The Sourcegraph GraphQL client
 * @param params - Search parameters including query and optional limit
 * @returns Formatted string containing search results with file paths, URLs, and code matches
 */
export async function searchCode(
  client: SourcegraphClient,
  params: SearchCodeParams,
): Promise<string> {
  const { query, limit = 10 } = params;

  // Add count limit to query
  const queryWithLimit = `${query} count:${limit.toString()}`;

  try {
    const response = await client.query<SearchResponse>(SEARCH_QUERY, {
      query: queryWithLimit,
    });

    const { results } = response.search;

    // Format results for AI consumption
    let output = `Search Query: ${query}\n`;
    output += `Result Count: ${results.matchCount.toString()}\n`;

    if (results.limitHit) {
      output += `Note: Result limit hit, showing first ${limit.toString()} results\n`;
    }

    if (results.cloning && results.cloning.length > 0) {
      output += `Warning: ${results.cloning.length.toString()} repositories still cloning\n`;
    }

    if (results.timedout && results.timedout.length > 0) {
      output += `Warning: ${results.timedout.length.toString()} repositories timed out\n`;
    }

    output += '\n';

    // Format each result
    results.results.forEach((result, index) => {
      if (result.__typename === 'FileMatch' && result.file && result.repository) {
        output += `Result ${(index + 1).toString()}:\n`;
        output += `Repository: ${result.repository.name}\n`;
        output += `File: ${result.file.path}\n`;
        output += `URL: ${result.file.url}\n`;

        if (result.lineMatches && result.lineMatches.length > 0) {
          output += 'Matches:\n';
          result.lineMatches.forEach((match) => {
            output += `  Line ${match.lineNumber.toString()}: ${match.preview.trim()}\n`;
          });
        }

        output += '\n';
      }
    });

    if (results.results.length === 0) {
      output += 'No results found.\n';
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error searching code: ${message}`;
  }
}
