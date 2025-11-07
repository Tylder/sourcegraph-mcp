/**
 * GraphQL query for fetching a repository file tree
 */

export const FILE_TREE_QUERY = `
  query FileTree($repo: String!, $path: String!, $rev: String!) {
    repository(name: $repo) {
      name
      url
      commit(rev: $rev) {
        oid
        tree(path: $path) {
          url
          entries {
            name
            path
            url
            isDirectory
            isSingleChild
            byteSize
            submodule {
              url
            }
          }
        }
      }
    }
  }
`;
