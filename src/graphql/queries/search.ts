/**
 * GraphQL queries for code search
 */

export const CODE_SEARCH_QUERY = `
  query CodeSearch($query: String!, $version: SearchVersion) {
    search(query: $query, version: $version, patternType: standard) {
      results {
        matchCount
        approximateResultCount
        limitHit
        dynamicFilters {
          value
          label
          count
          kind
        }
        results {
          __typename
          ... on FileMatch {
            repository {
              name
              url
            }
            file {
              path
              url
            }
            lineMatches {
              lineNumber
              offsetAndLengths
              preview
            }
          }
          ... on Repository {
            name
            url
            description
          }
          ... on CommitSearchResult {
            commit {
              repository {
                name
                url
              }
              oid
              abbreviatedOID
              url
              subject
            }
            messagePreview {
              value
            }
          }
        }
        cloning {
          name
        }
        timedout {
          name
        }
        missing {
          name
          reason
          url
        }
      }
    }
  }
`;

export const SEARCH_QUERY = `
  query Search($query: String!) {
    search(query: $query, version: V3, patternType: standard) {
      results {
        results {
          __typename
          ... on FileMatch {
            file {
              path
              url
              content
            }
            repository {
              name
              url
            }
            lineMatches {
              lineNumber
              offsetAndLengths
              preview
            }
          }
        }
        matchCount
        limitHit
        cloning {
          name
        }
        timedout {
          name
        }
      }
    }
  }
`;

export const COMMIT_SEARCH_QUERY = `
  query CommitSearch($query: String!) {
    search(query: $query, version: V3, patternType: standard) {
      results {
        results {
          __typename
          ... on CommitSearchResult {
            commit {
              repository {
                name
                url
              }
              oid
              abbreviatedOID
              url
              subject
              body
              author {
                person {
                  displayName
                  email
                }
                date
              }
            }
            messagePreview {
              value
            }
            diffPreview {
              value
            }
          }
        }
        matchCount
        limitHit
      }
    }
  }
`;
