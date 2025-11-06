/**
 * GraphQL queries for connection testing
 */

export const SITE_INFO_QUERY = `
  query SiteInfo {
    site {
      productVersion
      buildVersion
      hasCodeIntelligence
    }
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
