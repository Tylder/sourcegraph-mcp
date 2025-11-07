/**
 * GraphQL query for retrieving current user information
 */

export const CURRENT_USER_QUERY = `
  query CurrentUserInfo {
    currentUser {
      username
      email
      displayName
      organizations {
        nodes {
          name
          displayName
        }
      }
    }
  }
`;
