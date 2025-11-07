/**
 * GraphQL queries for repository operations
 */

export const REPOSITORY_LIST_QUERY = `
  query RepositoryList(
    $query: String
    $first: Int!
    $after: String
  ) {
    repositories(query: $query, first: $first, after: $after) {
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

export const REPO_COMPARISON_QUERY = `
  query RepoComparison(
    $name: String!
    $base: String!
    $head: String!
    $firstCommits: Int!
    $firstDiffs: Int!
  ) {
    repository(name: $name) {
      name
      comparison(base: $base, head: $head) {
        range {
          expression
        }
        commits(first: $firstCommits) {
          nodes {
            oid
            abbreviatedOID
            subject
            author {
              person {
                displayName
                name
                email
              }
              date
            }
            url
          }
          totalCount
        }
        fileDiffs(first: $firstDiffs) {
          nodes {
            oldPath
            newPath
            isBinary
            stat {
              added
              changed
              deleted
            }
            hunks {
              oldRange {
                startLine
                lines
              }
              newRange {
                startLine
                lines
              }
              body
            }
          }
          totalCount
        }
      }
    }
  }
`;
