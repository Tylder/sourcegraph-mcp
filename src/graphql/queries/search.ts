/**
 * GraphQL queries for code search
 */

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
