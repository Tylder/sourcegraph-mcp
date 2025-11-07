/**
 * GraphQL queries for repository operations
 */

export const REPOSITORY_LIST_QUERY = `
  query RepositoryList(
    $query: String
    $first: Int!
    $after: String
    $orderBy: RepositoryOrder
  ) {
    repositories(query: $query, first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        name
        url
        description
        isPrivate
        isFork
        isArchived
        mirrorInfo {
          cloned
          cloneInProgress
        }
        defaultBranch {
          displayName
        }
        viewerCanAdminister
        updatedAt
      }
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
