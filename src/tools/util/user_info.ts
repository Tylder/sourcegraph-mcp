/**
 * User info utility tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { CURRENT_USER_QUERY } from '../../graphql/queries/user.js';
import type { CurrentUser } from '../../types/sourcegraph.js';

export interface UserInfoResult {
  username: string;
  email: string;
  displayName: string | null;
  organizations: {
    name: string;
    displayName: string | null;
  }[];
}

interface CurrentUserResponse {
  currentUser: CurrentUser | null;
}

/**
 * Retrieve information about the currently authenticated Sourcegraph user.
 *
 * @param client Sourcegraph GraphQL client instance
 * @returns Basic profile details for the current user
 * @throws Error when the query fails or no user is authenticated
 */
export async function getUserInfo(client: SourcegraphClient): Promise<UserInfoResult> {
  try {
    const response = await client.query<CurrentUserResponse>(CURRENT_USER_QUERY);

    if (!response.currentUser) {
      throw new Error('No authenticated user found. Please check your access token.');
    }

    const { username, email, displayName, organizations } = response.currentUser;

    return {
      username,
      email,
      displayName: displayName ?? null,
      organizations: organizations.nodes.map((org) => ({
        name: org.name,
        displayName: org.displayName ?? null,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch user info: ${message}`);
  }
}
