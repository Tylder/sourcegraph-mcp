/**
 * Integration tests for Sourcegraph MCP Server
 * Tests all tools against a real Sourcegraph instance
 */

import { spawn } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

class McpClient {
  private child: ReturnType<typeof spawn>;
  private requestId = 1;
  private readonly responsePromises = new Map<number, PendingRequest>();

  constructor() {
    this.startServer();
  }

  private startServer(): void {
    const distPath = path.join(process.cwd(), 'dist', 'index.js');
    const sourcePath = path.join(process.cwd(), 'src', 'index.ts');
    const entryPoint = existsSync(distPath)
      ? { command: 'node', args: [distPath] }
      : { command: 'tsx', args: [sourcePath] };
    this.child = spawn(entryPoint.command, entryPoint.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        SRC_ENDPOINT: process.env.SRC_ENDPOINT ?? 'http://localhost:7080',
      },
    });

    this.child.stdout.on('data', (data: Buffer) => {
      const messages = data
        .toString()
        .split('\n')
        .filter((line) => line.trim());
      for (const message of messages) {
        try {
          const response = JSON.parse(message) as JsonRpcResponse;
          const promise = this.responsePromises.get(response.id);
          if (promise) {
            this.responsePromises.delete(response.id);
            if (response.error) {
              promise.reject(new Error(response.error.message));
            } else {
              promise.resolve(response.result);
            }
          }
        } catch {
          console.error('Failed to parse response:', message);
        }
      }
    });

    this.child.stderr.on('data', (data: Buffer) => {
      console.error('Server stderr:', data.toString());
    });

    this.child.on('exit', (code: number | null) => {
      console.log(`Server exited with code ${String(code ?? 'null')}`);
    });
  }

  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.responsePromises.set(request.id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  async initialize(): Promise<unknown> {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'integration-test', version: '1.0' },
    });
  }

  async listTools(): Promise<unknown> {
    return this.sendRequest('tools/list');
  }

  async callTool(name: string, args?: unknown): Promise<unknown> {
    return this.sendRequest('tools/call', {
      name,
      arguments: args ?? {},
    });
  }

  close(): void {
    this.child.kill();
  }
}

function assertIsRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} response was not a JSON object`);
  }
}

async function loadEnv(): Promise<void> {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const envVars = envContent.split('\n').reduce<Record<string, string>>((acc, line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        acc[key.trim()] = valueParts.join('=').trim();
      }
      return acc;
    }, {});
    Object.assign(process.env, envVars);
  } catch {
    // .env file doesn't exist, use existing env
  }
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const hasSourcegraphCredentials =
  typeof process.env.SRC_ACCESS_TOKEN === 'string' && process.env.SRC_ACCESS_TOKEN.length > 0;

const describeIntegration = hasSourcegraphCredentials ? describe : describe.skip;

if (!hasSourcegraphCredentials) {
  console.warn('Skipping integration tests: SRC_ACCESS_TOKEN environment variable not set');
}

describeIntegration('Sourcegraph MCP Server Integration Tests', () => {
  let client: McpClient | null = null;

  const getClient = (): McpClient => {
    if (client === null) {
      throw new Error('MCP client not initialized');
    }
    return client;
  };

  beforeAll(async () => {
    await loadEnv();
    client = new McpClient();
  }, 10000);

  afterAll(() => {
    client?.close();
  });

  test('should initialize MCP server', async () => {
    const activeClient = getClient();
    await expect(activeClient.initialize()).resolves.toBeDefined();
  }, 5000);

  test('should list all tools', async () => {
    const tools = (await getClient().listTools()) as { tools: { name: string }[] };
    expect(tools.tools).toHaveLength(13);
    expect(tools.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'connection_test',
        'user_info',
        'search_code',
        'search_symbols',
        'search_commits',
        'repo_list',
        'repo_info',
        'repo_branches',
        'file_tree',
        'file_get',
        'file_blame',
        'repo_compare_commits',
        'repo_languages',
      ]),
    );
  }, 5000);

  test('connection_test tool should work', async () => {
    const result = (await getClient().callTool('connection_test')) as {
      content: { type: string; text: string }[];
    };
    const [firstContent] = result.content;
    assertIsRecord(firstContent, 'connection_test content item');
    const { text } = firstContent;
    if (typeof text !== 'string') {
      throw new Error('connection_test response text was not a string');
    }
    const parsed = tryParseJSON(text);
    assertIsRecord(parsed, 'connection_test');
    const successValue = parsed.success;
    if (successValue !== true) {
      throw new Error('connection_test response did not indicate success');
    }
    const detailsValue = parsed.details;
    assertIsRecord(detailsValue, 'connection_test details');
    const details = detailsValue;
    if (typeof details.version !== 'string') {
      throw new Error('connection_test details did not include a version string');
    }
  }, 10000);

  test('user_info tool should work', async () => {
    const result = (await getClient().callTool('user_info')) as {
      content: { type: string; text: string }[];
    };
    const [firstContent] = result.content;
    assertIsRecord(firstContent, 'user_info content item');
    const { text } = firstContent;
    if (typeof text !== 'string') {
      throw new Error('user_info response text was not a string');
    }
    const parsed = tryParseJSON(text);
    assertIsRecord(parsed, 'user_info');
    if (typeof parsed.username !== 'string') {
      throw new Error('user_info response did not include a username string');
    }
    if (typeof parsed.email !== 'string') {
      throw new Error('user_info response did not include an email string');
    }
  }, 10000);

  test('repo_list tool should work', async () => {
    const result = (await getClient().callTool('repo_list', { first: 5 })) as {
      content: { type: string; text: string }[];
    };
    const [firstContent] = result.content;
    const { text } = firstContent;
    expect(text).toContain('Repository List');
    expect(text).toContain('github.com/Tylder/LaunchQuay');
  }, 10000);

  test('repo_info tool should work', async () => {
    const result = (await getClient().callTool('repo_info', {
      name: 'github.com/Tylder/LaunchQuay',
    })) as { content: { type: string; text: string }[] };
    const [firstContent] = result.content;
    const { text } = firstContent;
    expect(text).toContain('github.com/Tylder/LaunchQuay');
    expect(text).toContain('Private');
  }, 10000);

  test('repo_branches tool should work', async () => {
    const result = (await getClient().callTool('repo_branches', {
      repo: 'github.com/Tylder/LaunchQuay',
      limit: 5,
    })) as { content: { type: string; text: string }[] };
    const [firstContent] = result.content;
    const { text } = firstContent;
    expect(text).toContain('github.com/Tylder/LaunchQuay');
    expect(text).toContain('master');
  }, 10000);

  test('file_tree tool should work', async () => {
    const result = (await getClient().callTool('file_tree', {
      repo: 'github.com/Tylder/LaunchQuay',
    })) as { content: { type: string; text: string }[] };
    const [firstContent] = result.content;
    const { text } = firstContent;
    expect(text).toContain('github.com/Tylder/LaunchQuay');
    expect(text).toContain('Revision: HEAD');
  }, 10000);

  test('search_code tool should work', async () => {
    const result = (await getClient().callTool('search_code', {
      query: 'repo:github.com/Tylder/LaunchQuay function',
      limit: 3,
    })) as { content: { type: string; text: string }[] };
    const [firstContent] = result.content;
    const { text } = firstContent;
    expect(text).toContain('repo:github.com/Tylder/LaunchQuay function');
    expect(text).toContain('Result Count');
  }, 10000);
});
