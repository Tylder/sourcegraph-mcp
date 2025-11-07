/**
 * GraphQL query for retrieving blame information.
 */

export const FILE_BLAME_QUERY = `
  query FileBlame($repo: String!, $path: String!, $rev: String!, $startLine: Int, $endLine: Int) {
    repository(name: $repo) {
      name
      url
      commit(rev: $rev) {
        oid
        blob(path: $path) {
          path
          blame(startLine: $startLine, endLine: $endLine) {
            startLine
            endLine
            author {
              date
              person {
                displayName
                email
              }
            }
            commit {
              oid
              abbreviatedOID
              url
              subject
            }
          }
        }
      }
    }
  }
`;
