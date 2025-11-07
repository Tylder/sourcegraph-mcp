/**
 * GraphQL queries for repository operations
 */

export const REPO_INFO_QUERY = `
  query RepoInfo($name: String!) {
    repository(name: $name) {
      name
      description
      url
      isPrivate
      isFork
      isArchived
      viewerPermission
      mirrorInfo {
        cloned
        cloneInProgress
        cloneProgress
      }
      defaultBranch {
        displayName
      }
      diskUsage
      updatedAt
    }
  }
`;
