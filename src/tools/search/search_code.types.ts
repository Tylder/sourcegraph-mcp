/**
 * Shared type definitions for the code search tool.
 */

export type SearchVersion = 'V1' | 'V2' | 'V3';

export interface SearchCodeParams {
  /** Sourcegraph search query string. */
  readonly query: string;
  /** Maximum number of results to request (translates to `count:` filter). */
  readonly limit?: number;
  /** Search version flag understood by Sourcegraph (`V1`, `V2`, `V3`). */
  readonly version?: SearchVersion;
  /** Optional timeout in milliseconds (converted to `timeout:` filter). */
  readonly timeout?: number;
}

export interface SearchCodeLineMatch {
  readonly lineNumber: number;
  readonly preview: string;
  readonly offsets: readonly [number, number][];
}

export interface SearchCodeFileMatch {
  readonly repository: string;
  readonly repositoryUrl: string;
  readonly path: string;
  readonly url: string;
  readonly lineMatches: readonly SearchCodeLineMatch[];
}

export interface SearchCodeRepositoryMatch {
  readonly name: string;
  readonly url: string;
  readonly description?: string;
}

export interface SearchCodeCommitMatch {
  readonly repository: string;
  readonly repositoryUrl?: string;
  readonly oid: string;
  readonly abbreviatedOID?: string;
  readonly url: string;
  readonly subject?: string;
  readonly messagePreview?: string;
}

export interface SearchCodeFilter {
  readonly value: string;
  readonly label: string;
  readonly count: number;
  readonly kind: string;
}

export interface SearchCodeMissingRepo {
  readonly name: string;
  readonly reason?: string;
  readonly url?: string;
}

export interface SearchCodeResult {
  readonly query: string;
  readonly executedQuery: string;
  readonly limit: number;
  readonly version: SearchVersion;
  readonly matchCount: number;
  readonly approximateResultCount: string;
  readonly limitHit: boolean;
  readonly dynamicFilters: readonly SearchCodeFilter[];
  readonly fileMatches: readonly SearchCodeFileMatch[];
  readonly repositoryMatches: readonly SearchCodeRepositoryMatch[];
  readonly commitMatches: readonly SearchCodeCommitMatch[];
  readonly status: {
    readonly cloning: readonly string[];
    readonly timedout: readonly string[];
    readonly missing: readonly SearchCodeMissingRepo[];
  };
}
