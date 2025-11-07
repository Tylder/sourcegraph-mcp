/**
 * GraphQL client for Sourcegraph API
 */

import { GraphQLClient } from 'graphql-request';
import type { Config } from '../config.js';

export class SourcegraphClient {
  private readonly client: GraphQLClient;

  constructor(config: Config) {
    const endpoint = `${config.endpoint}/.api/graphql`;

    this.client = new GraphQLClient(endpoint, {
      headers: {
        Authorization: `token ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      fetch: async (url, options): Promise<Response> => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(config.timeout),
        });
      },
    });
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GraphQL query failed: ${error.message}`);
      }
      throw error;
    }
  }

  async queryWithErrorHandling<T>(
    query: string,
    defaultValue: T,
    variables?: Record<string, unknown>,
  ): Promise<{ data: T; errors: string[] }> {
    try {
      const data = await this.query<T>(query, variables);
      return { data, errors: [] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { data: defaultValue, errors: [message] };
    }
  }
}
