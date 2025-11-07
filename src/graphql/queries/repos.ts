/**
 * GraphQL queries for repository operations
 */

export const REPO_BRANCHES_QUERY = `
  query RepoBranches($name: String!, $query: String, $first: Int!) {
    repository(name: $name) {
      name
      url
      defaultBranch {
        displayName
      }
      branches(first: $first, query: $query) {
        nodes {
          name
          displayName
          abbreviatedName
          url
          target {
            oid
            abbreviatedOID
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`;
