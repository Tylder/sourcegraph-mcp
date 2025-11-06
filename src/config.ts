/**
 * Configuration for Sourcegraph MCP Server
 * Reads from environment variables
 */

export interface Config {
  endpoint: string;
  accessToken: string;
  timeout: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export function getConfig(): Config {
  const endpoint = process.env.SRC_ENDPOINT ?? 'https://sourcegraph.com';
  const accessToken = process.env.SRC_ACCESS_TOKEN;
  const timeout = parseInt(process.env.TIMEOUT_MS ?? '30000', 10);
  const logLevel = (process.env.LOG_LEVEL ?? 'info') as Config['logLevel'];

  if (!accessToken) {
    throw new Error('SRC_ACCESS_TOKEN environment variable is required');
  }

  return {
    endpoint,
    accessToken,
    timeout,
    logLevel,
  };
}

export function validateConfig(config: Config): void {
  if (!config.endpoint) {
    throw new Error('Sourcegraph endpoint is required');
  }

  if (!config.accessToken) {
    throw new Error('Sourcegraph access token is required');
  }

  try {
    new URL(config.endpoint);
  } catch {
    throw new Error(`Invalid Sourcegraph endpoint URL: ${config.endpoint}`);
  }
}
