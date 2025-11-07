import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fileGet } from '../../../src/tools/files/file_get.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

type MockSourcegraphClient = Pick<SourcegraphClient, 'query'>;

describe('fileGet tool', () => {
  let queryMock: ReturnType<typeof vi.fn>;
  let client: MockSourcegraphClient;

  beforeEach(() => {
    queryMock = vi.fn();
    client = { query: queryMock } as unknown as MockSourcegraphClient;
  });

  it('formats metadata and content for a text file', async () => {
    queryMock.mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
        commit: {
          oid: 'abcdef123456',
          blob: {
            path: 'README.md',
            content: '# Hello\nWorld',
            byteSize: 13,
            isBinary: false,
            highlight: { aborted: false },
          },
        },
      },
    });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
      rev: 'main',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('query FileContent'), {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
      rev: 'main',
    });

    expect(result).toContain('Repository: github.com/sourcegraph/sourcegraph');
    expect(result).toContain('Path: README.md');
    expect(result).toContain('Revision Requested: main');
    expect(result).toContain('Revision OID: abcdef123456');
    expect(result).toContain('Size: 13 bytes');
    expect(result).toContain('# Hello');
    expect(result).toContain('World');
  });

  it('warns when attempting to read a binary file', async () => {
    queryMock.mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/src-cli',
        url: 'https://sourcegraph.com/github.com/sourcegraph/src-cli',
        commit: {
          oid: 'deadbeef',
          blob: {
            path: 'bin/app',
            content: null,
            byteSize: 2048,
            isBinary: true,
            highlight: { aborted: false },
          },
        },
      },
    });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/src-cli',
      path: 'bin/app',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('query FileContent'), {
      repo: 'github.com/sourcegraph/src-cli',
      path: 'bin/app',
      rev: 'HEAD',
    });

    expect(result).toContain('Repository: github.com/sourcegraph/src-cli');
    expect(result).toContain('Revision Requested: HEAD');
    expect(result).toContain('Size: 2048 bytes');
    expect(result).toMatch(/Warning: Binary file content is not displayed\.\n$/u);
  });

  it('returns a warning when syntax highlighting is aborted', async () => {
    queryMock.mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
        commit: {
          oid: 'abcdef123456',
          blob: {
            path: 'src/app.ts',
            content: 'console.log("hi")',
            byteSize: 42,
            isBinary: false,
            highlight: { aborted: true },
          },
        },
      },
    });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'src/app.ts',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('query FileContent'), {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'src/app.ts',
      rev: 'HEAD',
    });

    expect(result).toContain('Warning: Syntax highlighting was aborted due to timeout.');
  });

  it('notifies when repository is missing', async () => {
    queryMock.mockResolvedValue({ repository: null });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('query FileContent'), {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
      rev: 'HEAD',
    });

    expect(result).toBe('Repository github.com/sourcegraph/sourcegraph not found.');
  });

  it('notifies when revision is missing', async () => {
    queryMock.mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
        commit: null,
      },
    });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
      rev: 'feature-branch',
    });

    expect(result).toBe('Revision feature-branch not found in github.com/sourcegraph/sourcegraph.');
  });

  it('notifies when file is missing', async () => {
    queryMock.mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
        commit: {
          oid: 'abcdef123456',
          blob: null,
        },
      },
    });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
    });

    expect(result).toBe('File README.md not found at HEAD in github.com/sourcegraph/sourcegraph.');
  });

  it('indicates when no content is available', async () => {
    queryMock.mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        url: 'https://sourcegraph.com/github.com/sourcegraph/sourcegraph',
        commit: {
          oid: 'abcdef123456',
          blob: {
            path: 'README.md',
            content: null,
            byteSize: null,
            isBinary: false,
            highlight: { aborted: false },
          },
        },
      },
    });

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
    });

    expect(result).toContain('Size: unknown');
    expect(result).toMatch(/No content available for this file\.\n$/u);
  });

  it('returns a formatted error when the query fails', async () => {
    queryMock.mockRejectedValue(new Error('network down'));

    const result = await fileGet(client as SourcegraphClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      path: 'README.md',
    });

    expect(result).toBe('Error retrieving file: network down');
  });
});
