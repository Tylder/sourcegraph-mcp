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
