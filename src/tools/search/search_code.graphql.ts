/**
 * Type definitions describing the GraphQL response returned by the search query.
 */

export interface GraphQLLineMatch {
  readonly lineNumber: number;
  readonly preview?: string | null;
  readonly offsetAndLengths?: readonly [number, number][] | null;
}

export interface GraphQLFileMatch {
  readonly __typename: 'FileMatch';
  readonly repository?: { readonly name: string; readonly url: string } | null;
  readonly file?: { readonly path: string; readonly url: string } | null;
  readonly lineMatches?: readonly GraphQLLineMatch[] | null;
}

export interface GraphQLRepositoryMatch {
  readonly __typename: 'Repository';
  readonly name: string;
  readonly url: string;
  readonly description?: string | null;
}

export interface GraphQLCommit {
  readonly repository?: { readonly name: string; readonly url: string } | null;
  readonly oid: string;
  readonly abbreviatedOID?: string | null;
  readonly url: string;
  readonly subject?: string | null;
}

export interface GraphQLCommitMatch {
  readonly __typename: 'CommitSearchResult';
  readonly commit?: GraphQLCommit | null;
  readonly messagePreview?: { readonly value?: string | null } | null;
}

export interface GraphQLUnknownResult {
  readonly __typename: string;
}

export type GraphQLSearchResult =
  | GraphQLFileMatch
  | GraphQLCommitMatch
  | GraphQLRepositoryMatch
  | GraphQLUnknownResult;

export interface GraphQLSearchResponse {
  readonly search: {
    readonly results: {
      readonly matchCount: number;
      readonly approximateResultCount: string;
      readonly limitHit: boolean;
      readonly dynamicFilters?:
        | readonly {
            readonly value: string;
            readonly label: string;
            readonly count: number;
            readonly kind: string;
          }[]
        | null;
      readonly results: readonly GraphQLSearchResult[];
      readonly cloning?: readonly { readonly name: string }[] | null;
      readonly timedout?: readonly { readonly name: string }[] | null;
      readonly missing?:
        | readonly {
            readonly name: string;
            readonly reason?: string | null;
            readonly url?: string | null;
          }[]
        | null;
    };
  };
}

export const isFileMatchResult = (result: GraphQLSearchResult): result is GraphQLFileMatch => {
  return result.__typename === 'FileMatch';
};

export const isRepositoryMatchResult = (
  result: GraphQLSearchResult,
): result is GraphQLRepositoryMatch => {
  return result.__typename === 'Repository';
};

export const isCommitMatchResult = (result: GraphQLSearchResult): result is GraphQLCommitMatch => {
  return result.__typename === 'CommitSearchResult';
};
