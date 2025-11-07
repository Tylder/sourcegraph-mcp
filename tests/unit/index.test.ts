import { describe, it, expect, beforeEach, vi } from 'vitest';

const toolHandlers = new Map<string, (args?: unknown) => Promise<unknown>>();
const toolSchemas = new Map<string, unknown>();
const registeredDescriptions = new Map<string, string>();
const connectMock = vi.fn();
const searchCodeMock = vi.fn().mockResolvedValue('code result');
const searchSymbolsMock = vi.fn().mockResolvedValue('symbols result');
const searchCommitsMock = vi.fn().mockResolvedValue('commits result');
const repoListMock = vi.fn().mockResolvedValue('list result');
const repoInfoMock = vi.fn().mockResolvedValue('info result');
const repoBranchesMock = vi.fn().mockResolvedValue('branches result');
const fileTreeMock = vi.fn().mockResolvedValue('tree result');
const fileGetMock = vi.fn().mockResolvedValue('file get result');
const fileBlameMock = vi.fn().mockResolvedValue('blame result');
const testConnectionMock = vi.fn().mockResolvedValue({ foo: 'bar' });
const configMock = { endpoint: 'https://example.com', accessToken: 'token', timeout: 1234, logLevel: 'info' };
const validateConfigMock = vi.fn();
const createdClients: unknown[] = [];

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
    tool(name: string, description: string, schemaOrHandler: unknown, maybeHandler?: unknown) {
      const handler = typeof schemaOrHandler === 'function' ? schemaOrHandler : (maybeHandler as (args: unknown) => Promise<unknown>);
      const schema = typeof schemaOrHandler === 'function' ? undefined : schemaOrHandler;
      toolHandlers.set(name, handler);
      toolSchemas.set(name, schema);
      registeredDescriptions.set(name, description);
    }
    connect = connectMock;
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    toString() {
      return '[MockTransport]';
    }
  },
}));

vi.mock('../../src/config.js', () => ({
  getConfig: () => configMock,
  validateConfig: validateConfigMock,
}));

vi.mock('../../src/graphql/client.js', () => ({
  SourcegraphClient: class {
    config: unknown;
    constructor(cfg: unknown) {
      this.config = cfg;
      createdClients.push(cfg);
    }
  },
}));

vi.mock('../../src/tools/util/connection.js', () => ({
  testConnection: testConnectionMock,
}));

vi.mock('../../src/tools/search/code.js', () => ({
  searchCode: searchCodeMock,
}));

vi.mock('../../src/tools/search/symbols.js', () => ({
  searchSymbols: searchSymbolsMock,
}));

vi.mock('../../src/tools/search/commits.js', () => ({
  searchCommits: searchCommitsMock,
}));

vi.mock('../../src/tools/repos/list.js', () => ({
  repoList: repoListMock,
}));

vi.mock('../../src/tools/repos/info.js', () => ({
  repoInfo: repoInfoMock,
}));

vi.mock('../../src/tools/repos/branches.js', () => ({
  repoBranches: repoBranchesMock,
}));

vi.mock('../../src/tools/files/tree.js', () => ({
  fileTree: fileTreeMock,
}));

vi.mock('../../src/tools/files/get.js', () => ({
  fileGet: fileGetMock,
}));

vi.mock('../../src/tools/files/blame.js', () => ({
  fileBlame: fileBlameMock,
}));

describe('index entrypoint', () => {
  beforeEach(() => {
    toolHandlers.clear();
    toolSchemas.clear();
    registeredDescriptions.clear();
    connectMock.mockClear();
    searchCodeMock.mockClear();
    searchSymbolsMock.mockClear();
    searchCommitsMock.mockClear();
    repoListMock.mockClear();
    repoInfoMock.mockClear();
    repoBranchesMock.mockClear();
    fileTreeMock.mockClear();
    fileGetMock.mockClear();
    fileBlameMock.mockClear();
    testConnectionMock.mockClear();
    validateConfigMock.mockClear();
    createdClients.length = 0;
  });

  it('registers all tools and executes handlers', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await import('../../src/index.js');

    expect(validateConfigMock).toHaveBeenCalledWith(configMock);
    expect(createdClients).toEqual([configMock]);
    expect(connectMock).toHaveBeenCalledWith(expect.any(Object));
    expect(consoleSpy).toHaveBeenCalledWith('Sourcegraph MCP Server running on stdio');

    const toolNames = [
      'connection_test',
      'search_code',
      'search_symbols',
      'search_commits',
      'repo_list',
      'repo_info',
      'repo_branches',
      'file_tree',
      'file_get',
      'file_blame',
    ];

    for (const name of toolNames) {
      expect(toolHandlers.has(name)).toBe(true);
      expect(registeredDescriptions.get(name)).toBeDefined();
    }

    await toolHandlers.get('connection_test')?.();
    expect(testConnectionMock).toHaveBeenCalled();

    await toolHandlers.get('search_code')?.({ query: 'q', limit: 2 });
    expect(searchCodeMock).toHaveBeenCalledWith(expect.anything(), { query: 'q', limit: 2 });

    await toolHandlers.get('search_symbols')?.({ query: 'q', types: ['class'], limit: 3 });
    expect(searchSymbolsMock).toHaveBeenCalledWith(expect.anything(), {
      query: 'q',
      types: ['class'],
      limit: 3,
    });

    await toolHandlers.get('search_commits')?.({ query: 'q', author: 'a', after: 'b', before: 'c', limit: 4 });
    expect(searchCommitsMock).toHaveBeenCalledWith(expect.anything(), {
      query: 'q',
      author: 'a',
      after: 'b',
      before: 'c',
      limit: 4,
    });

    await toolHandlers.get('repo_list')?.({ query: 'q', first: 5 });
    expect(repoListMock).toHaveBeenCalledWith(expect.anything(), { query: 'q', first: 5 });

    await toolHandlers.get('repo_info')?.({ name: 'name' });
    expect(repoInfoMock).toHaveBeenCalledWith(expect.anything(), { name: 'name' });

    await toolHandlers.get('repo_branches')?.({ repo: 'name', query: 'branch', limit: 6 });
    expect(repoBranchesMock).toHaveBeenCalledWith(expect.anything(), {
      repo: 'name',
      query: 'branch',
      limit: 6,
    });

    await toolHandlers.get('file_tree')?.({ repo: 'r', path: 'p', rev: 'v' });
    expect(fileTreeMock).toHaveBeenCalledWith(expect.anything(), { repo: 'r', path: 'p', rev: 'v' });

    await toolHandlers.get('file_get')?.({ repo: 'r', path: 'p', rev: 'v' });
    expect(fileGetMock).toHaveBeenCalledWith(expect.anything(), { repo: 'r', path: 'p', rev: 'v' });

    await toolHandlers.get('file_blame')?.({ repo: 'r', path: 'p', rev: 'v' });
    expect(fileBlameMock).toHaveBeenCalledWith(expect.anything(), { repo: 'r', path: 'p', rev: 'v' });

    consoleSpy.mockRestore();
  });
});
