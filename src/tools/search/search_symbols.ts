/**
 * Symbol search tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { SYMBOL_SEARCH_QUERY } from '../../graphql/queries/search.js';

interface Position {
  line?: number | null;
  character?: number | null;
}

interface SymbolLocation {
  resource?: {
    repository?: {
      name: string;
      url?: string | null;
    } | null;
    path?: string | null;
  } | null;
  range?: {
    start?: Position | null;
  } | null;
}

interface SymbolResultNode {
  __typename: string;
  symbol?: {
    name: string;
    kind: string;
    language: string;
    containerName?: string | null;
    url: string;
    location?: SymbolLocation | null;
  } | null;
}

interface SymbolSearchResponse {
  search: {
    results: {
      results: SymbolResultNode[];
      matchCount: number;
      limitHit: boolean;
      pageInfo?: {
        hasNextPage: boolean;
        endCursor?: string | null;
      } | null;
    };
  };
}

export interface SearchSymbolsParams {
  query: string;
  types?: readonly string[];
  limit?: number;
  cursor?: string;
}

const DEFAULT_LIMIT = 10;

const KNOWN_SYMBOL_KINDS = new Set<string>([
  'FILE',
  'MODULE',
  'NAMESPACE',
  'PACKAGE',
  'CLASS',
  'METHOD',
  'PROPERTY',
  'FIELD',
  'CONSTRUCTOR',
  'ENUM',
  'INTERFACE',
  'FUNCTION',
  'VARIABLE',
  'CONSTANT',
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'ARRAY',
  'OBJECT',
  'KEY',
  'NULL',
  'ENUMMEMBER',
  'STRUCT',
  'EVENT',
  'OPERATOR',
  'TYPEPARAMETER',
]);

const SYMBOL_KIND_ALIASES: Record<string, string> = {
  file: 'FILE',
  module: 'MODULE',
  namespace: 'NAMESPACE',
  pkg: 'PACKAGE',
  package: 'PACKAGE',
  class: 'CLASS',
  method: 'METHOD',
  property: 'PROPERTY',
  field: 'FIELD',
  ctor: 'CONSTRUCTOR',
  constructor: 'CONSTRUCTOR',
  enum: 'ENUM',
  interface: 'INTERFACE',
  function: 'FUNCTION',
  func: 'FUNCTION',
  def: 'FUNCTION',
  variable: 'VARIABLE',
  var: 'VARIABLE',
  let: 'VARIABLE',
  constant: 'CONSTANT',
  const: 'CONSTANT',
  string: 'STRING',
  number: 'NUMBER',
  boolean: 'BOOLEAN',
  array: 'ARRAY',
  object: 'OBJECT',
  key: 'KEY',
  null: 'NULL',
  'enum member': 'ENUMMEMBER',
  enummember: 'ENUMMEMBER',
  struct: 'STRUCT',
  event: 'EVENT',
  operator: 'OPERATOR',
  'type parameter': 'TYPEPARAMETER',
  typeparameter: 'TYPEPARAMETER',
};

const normalizeTypeFilters = (
  types: readonly string[] | undefined
): { accepted: string[]; ignored: string[] } => {
  if (!types) {
    return { accepted: [], ignored: [] };
  }

  const accepted = new Set<string>();
  const ignored: string[] = [];

  types.forEach((rawType) => {
    if (typeof rawType !== 'string') {
      return;
    }

    const trimmed = rawType.trim();
    if (trimmed.length === 0) {
      return;
    }

    const lookupKey = trimmed.toLowerCase();
    const canonical =
      SYMBOL_KIND_ALIASES[lookupKey] ??
      (KNOWN_SYMBOL_KINDS.has(trimmed.toUpperCase()) ? trimmed.toUpperCase() : undefined);

    if (canonical) {
      accepted.add(canonical);
    } else {
      ignored.push(trimmed);
    }
  });

  return { accepted: [...accepted], ignored };
};

const quoteIfNeeded = (value: string): string => {
  return value.includes(' ') ? `"${value.replace(/"/g, '\\"')}"` : value;
};

const buildTypeFilter = (types: string[]): string | undefined => {
  if (types.length === 0) {
    return undefined;
  }

  const filters = types.map((type) => `kind:${quoteIfNeeded(type)}`);
  return filters.length === 1 ? filters[0] : `(${filters.join(' OR ')})`;
};

const buildSearchQuery = (
  params: SearchSymbolsParams,
  acceptedTypes: readonly string[]
): { query: string; requested: number } => {
  const { query, limit = DEFAULT_LIMIT } = params;
  const segments: string[] = ['type:symbol'];

  if (query.trim().length > 0) {
    segments.push(query.trim());
  }

  const typeFilter = buildTypeFilter([...acceptedTypes]);
  if (typeFilter) {
    segments.push(typeFilter);
  }

  segments.push(`count:${limit.toString()}`);

  return { query: segments.join(' '), requested: limit };
};

const toOneBased = (value: number | undefined | null): number | undefined => {
  if (typeof value !== 'number') {
    return undefined;
  }

  return value + 1;
};

const formatSymbolResult = (
  symbol: NonNullable<SymbolResultNode['symbol']>,
  index: number
): string[] => {
  const lines: string[] = [
    `Result ${(index + 1).toString()}:`,
    `Name: ${symbol.name}`,
    `Kind: ${symbol.kind}`,
  ];

  lines.push(`Language: ${symbol.language}`);

  if (symbol.containerName) {
    lines.push(`Container: ${symbol.containerName}`);
  }

  const location = symbol.location;
  const repositoryName = location?.resource?.repository?.name;
  if (repositoryName) {
    lines.push(`Repository: ${repositoryName}`);
  }

  const filePath = location?.resource?.path;
  if (filePath) {
    lines.push(`File: ${filePath}`);
  }

  lines.push(`URL: ${symbol.url}`);

  const start = location?.range?.start;
  const lineNumber = toOneBased(start?.line ?? undefined);
  const character = toOneBased(start?.character ?? undefined);

  if (lineNumber !== undefined) {
    lines.push(`Line: ${lineNumber.toString()}`);
  }

  if (character !== undefined) {
    lines.push(`Column: ${character.toString()}`);
  }

  return lines;
};

export async function searchSymbols(
  client: SourcegraphClient,
  params: SearchSymbolsParams
): Promise<string> {
  const { cursor } = params;
  const { accepted: acceptedTypes, ignored: ignoredTypes } = normalizeTypeFilters(params.types);
  const { query, requested } = buildSearchQuery(params, acceptedTypes);

  const variables: Record<string, string | number | null> = { query };
  if (cursor && cursor.trim().length > 0) {
    variables.cursor = cursor;
  } else {
    variables.cursor = null;
  }

  try {
    const response = await client.query<SymbolSearchResponse>(
      SYMBOL_SEARCH_QUERY as string,
      variables
    );
    const results = response.search.results;
    const summaryLines: string[] = ['Symbol Search Results', `Query: ${params.query}`];

    if (acceptedTypes.length > 0) {
      summaryLines.push(`Type Filters: ${acceptedTypes.join(', ')}`);
    }

    if (ignoredTypes.length > 0) {
      summaryLines.push(`Ignored Type Filters: ${ignoredTypes.join(', ')}`);
    }

    summaryLines.push(`Requested: ${requested.toString()}`);
    summaryLines.push(`Match Count: ${results.matchCount.toString()}`);

    if (results.pageInfo) {
      summaryLines.push(`Has Next Page: ${results.pageInfo.hasNextPage ? 'yes' : 'no'}`);
      if (results.pageInfo.hasNextPage && results.pageInfo.endCursor) {
        summaryLines.push(`Next Page Cursor: ${results.pageInfo.endCursor}`);
      }
    }

    const outputLines = [...summaryLines, ''];

    if (results.limitHit) {
      outputLines.push(`Note: Result limit hit, showing first ${requested.toString()} symbols`, '');
    }

    const symbolResults = results.results.filter(
      (
        result
      ): result is SymbolResultNode & { symbol: NonNullable<SymbolResultNode['symbol']> } => {
        return (
          result.__typename === 'SymbolSearchResult' &&
          result.symbol !== null &&
          result.symbol !== undefined
        );
      }
    );

    if (symbolResults.length === 0) {
      outputLines.push('No symbols found.');
      return `${outputLines.join('\n')}\n`;
    }

    symbolResults.forEach((result, index) => {
      outputLines.push(...formatSymbolResult(result.symbol, index), '');
    });

    return `${outputLines.join('\n')}\n`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error searching symbols: ${message}`;
  }
}

export const __testHooks = {
  normalizeTypeFilters,
  quoteIfNeeded,
  buildSearchQuery,
  aliases: SYMBOL_KIND_ALIASES,
  knownKinds: KNOWN_SYMBOL_KINDS,
} as const;
