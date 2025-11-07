/**
 * GraphQL query for retrieving file blame information
 */

export const FILE_BLAME_QUERY = `
  query FileBlame($repo: String!, $path: String!, $rev: String) {
    repository(name: $repo) {
      name
      url
      commit(rev: $rev) {
        oid
        url
        file(path: $path) {
          path
          url
          blame(startLine: 1) {
            startLine
            endLine
            commit {
              oid
              abbreviatedOID
              url
              subject
              author {
                person {
                  displayName
                  name
                  email
                }
                date
              }
            }
          }
        }
      }
    }
  }
`;
