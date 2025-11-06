/**
 * Symbol search tool
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
    };
  };
}

export interface SearchSymbolsParams {
  query: string;
  types?: string[];
  limit?: number;
}

export async function searchSymbols(
  client: SourcegraphClient,
  params: SearchSymbolsParams
): Promise<string> {
  const { query, types = [], limit = 10 } = params;

  // Build search query with symbol type filters
  let searchQuery = `type:symbol ${query}`;

  if (types.length > 0) {
    const typeFilter = types.map((t) => `symbol:${t}`).join(' OR ');
    searchQuery = `${searchQuery} (${typeFilter})`;
  }

  searchQuery = `${searchQuery} count:${limit.toString()}`;

  try {
    const response = await client.query<SearchResponse>(SEARCH_QUERY, {
      query: searchQuery,
    });

    const results = response.search.results;

    // Format results
    let output = `Search Query: ${query}\n`;
    if (types.length > 0) {
      output += `Symbol Types: ${types.join(', ')}\n`;
    }
    output += `Result Count: ${results.matchCount.toString()}\n\n`;

    if (results.limitHit) {
      output += `Note: Result limit hit, showing first ${limit.toString()} results\n\n`;
    }

    results.results.forEach((result, index) => {
      if (result.__typename === 'FileMatch' && result.file && result.repository) {
        output += `Result ${(index + 1).toString()}:\n`;
        output += `Repository: ${result.repository.name}\n`;
        output += `File: ${result.file.path}\n`;
        output += `URL: ${result.file.url}\n`;

        if (result.lineMatches && result.lineMatches.length > 0) {
          output += 'Symbols:\n';
          result.lineMatches.forEach((match) => {
            output += `  Line ${match.lineNumber.toString()}: ${match.preview.trim()}\n`;
          });
        }

        output += '\n';
      }
    });

    if (results.results.length === 0) {
      output += 'No symbols found.\n';
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error searching symbols: ${message}`;
  }
}
