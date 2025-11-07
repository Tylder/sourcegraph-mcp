/**
 * GraphQL queries for repository operations
 */

export const REPOSITORY_LIST_QUERY = `
  query RepositoryList(
    $query: String
    $first: Int!
    $after: String
    $orderBy: RepositoryOrderByInput!
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
export const REPO_INFO_QUERY = `
  query RepoInfo($name: String!) {
    repository(name: $name) {
      name
      description
      url
      isPrivate
      isFork
      isArchived
      viewerCanAdminister
      mirrorInfo {
        cloned
        cloneInProgress
        cloneProgress
      }
      defaultBranch {
        displayName
      }
      updatedAt
    }
  }
`;

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
          abbrevName
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
