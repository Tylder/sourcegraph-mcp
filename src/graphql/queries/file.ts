/**
 * GraphQL queries for file operations
 */

export const FILE_CONTENT_QUERY = `
  query FileContent($repo: String!, $path: String!, $rev: String!) {
    repository(name: $repo) {
      name
      url
      commit(rev: $rev) {
        oid
        blob(path: $path) {
          path
          content
          byteSize
          isBinary: binary
          highlight(disableTimeout: false) {
            aborted
          }
        }
      }
    }
  }
`;
