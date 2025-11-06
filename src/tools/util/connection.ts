/**
 * Connection test utility tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { SITE_INFO_QUERY } from '../../graphql/queries/connection.js';
import type { SiteInfo, CurrentUser } from '../../types/sourcegraph.js';

interface ConnectionTestResponse {
  site: SiteInfo;
  currentUser: CurrentUser;
}

export async function testConnection(
  client: SourcegraphClient
): Promise<{ success: boolean; message: string; details?: unknown }> {
  try {
    const response = await client.query<ConnectionTestResponse>(SITE_INFO_QUERY);

    return {
      success: true,
      message: 'Successfully connected to Sourcegraph',
      details: {
        version: response.site.productVersion,
        user: response.currentUser.username,
        email: response.currentUser.email,
        organizations: response.currentUser.organizations.nodes.map((org) => org.name),
        codeIntelligence: response.site.hasCodeIntelligence,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
