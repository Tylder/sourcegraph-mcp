/**
 * Integration tests for Sourcegraph MCP Server
 * Tests all tools against a real Sourcegraph instance
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

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

class McpClient {
  private child: ReturnType<typeof spawn>;
  private requestId = 1;
  private readonly responsePromises = new Map<
    number,
    { resolve:(value: unknown) => void; reject: (error: Error) => void }
  >();

  constructor() {
    this.startServer();
  }

  private startServer(): void {
    const serverPath = path.join(process.cwd(), 'dist', 'index.js');
    this.child = spawn('node', [serverPath], {
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

describe('Sourcegraph MCP Server Integration Tests', () => {
  let client: McpClient;

  beforeAll(async () => {
    await loadEnv();
    client = new McpClient();
  }, 10000);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  test('should initialize MCP server', async () => {
    await expect(client.initialize()).resolves.toBeDefined();
  }, 5000);

  test('should list all tools', async () => {
    const tools = (await client.listTools()) as { tools: { name: string }[] };
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
    const result = (await client.callTool('connection_test')) as {
      content: { type: string; text: string }[];
    };
    const { text } = result.content[0];
    const parsed = tryParseJSON(text);
    expect(parsed).toHaveProperty('success', true);
    expect(parsed).toHaveProperty('details');
    expect(parsed.details).toHaveProperty('version');
  }, 10000);

  test('user_info tool should work', async () => {
    const result = (await client.callTool('user_info')) as {
      content: { type: string; text: string }[];
    };
    const { text } = result.content[0];
    const parsed = tryParseJSON(text);
    expect(parsed).toHaveProperty('username');
    expect(parsed).toHaveProperty('email');
  }, 10000);

  test('repo_list tool should work', async () => {
    const result = (await client.callTool('repo_list', { first: 5 })) as {
      content: { type: string; text: string }[];
    };
    const { text } = result.content[0];
    expect(text).toContain('Repository List');
    expect(text).toContain('github.com/Tylder/LaunchQuay');
  }, 10000);

  test('repo_info tool should work', async () => {
    const result = (await client.callTool('repo_info', {
      name: 'github.com/Tylder/LaunchQuay',
    })) as { content: { type: string; text: string }[] };
    const { text } = result.content[0];
    expect(text).toContain('github.com/Tylder/LaunchQuay');
    expect(text).toContain('Private');
  }, 10000);

  test('repo_branches tool should work', async () => {
    const result = (await client.callTool('repo_branches', {
      repo: 'github.com/Tylder/LaunchQuay',
      limit: 5,
    })) as { content: { type: string; text: string }[] };
    const { text } = result.content[0];
    expect(text).toContain('github.com/Tylder/LaunchQuay');
    expect(text).toContain('master');
  }, 10000);

  test('file_tree tool should work', async () => {
    const result = (await client.callTool('file_tree', {
      repo: 'github.com/Tylder/LaunchQuay',
    })) as { content: { type: string; text: string }[] };
    const { text } = result.content[0];
    expect(text).toContain('github.com/Tylder/LaunchQuay');
    expect(text).toContain('Revision: HEAD');
  }, 10000);

  test('search_code tool should work', async () => {
    const result = (await client.callTool('search_code', {
      query: 'repo:github.com/Tylder/LaunchQuay function',
      limit: 3,
    })) as { content: { type: string; text: string }[] };
    const { text } = result.content[0];
    expect(text).toContain('repo:github.com/Tylder/LaunchQuay function');
    expect(text).toContain('Result Count');
  }, 10000);
});
