import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fetchMock = vi.fn();
const { requestMock, clientInstances } = vi.hoisted(() => {
  return {
    requestMock: vi.fn(),
    clientInstances: [] as {
      endpoint: string;
      options: { headers: Record<string, string>; fetch: typeof fetch };
    }[],
  };
});

vi.mock('graphql-request', () => {
  class GraphQLClientDouble {
    endpoint: string;
    options: { headers: Record<string, string>; fetch: typeof fetch };

    constructor(
      endpoint: string,
      options: { headers: Record<string, string>; fetch: typeof fetch },
    ) {
      this.endpoint = endpoint;
      this.options = options;
      clientInstances.push({ endpoint, options });
    }

    request = requestMock;
  }

  return {
    GraphQLClient: GraphQLClientDouble,
  };
});

import { SourcegraphClient } from '../../src/graphql/client.js';

describe('SourcegraphClient', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    requestMock.mockReset();
    clientInstances.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs GraphQL client with correct headers and timeout', async () => {
    const client = new SourcegraphClient({
      endpoint: 'https://example.com',
      accessToken: 'token-123',
      timeout: 1234,
      logLevel: 'info',
    });

    expect(client).toBeInstanceOf(SourcegraphClient);
    expect(clientInstances).toHaveLength(1);
    const instance = clientInstances[0];
    expect(instance.endpoint).toBe('https://example.com/.api/graphql');
    expect(instance.options.headers).toEqual({
      Authorization: 'token token-123',
      'Content-Type': 'application/json',
    });

    await instance.options.fetch('https://example.com/.api/graphql', { method: 'POST' });
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/.api/graphql', {
      method: 'POST',
      signal: expect.any(AbortSignal),
    });
  });

  it('performs successful query', async () => {
    const expected = { ok: true };
    requestMock.mockResolvedValueOnce(expected);
    const client = new SourcegraphClient({
      endpoint: 'https://sg.com',
      accessToken: 'abc',
      timeout: 1000,
      logLevel: 'info',
    });

    const result = await client.query<typeof expected>('query { test }');
    expect(result).toBe(expected);
  });

  it('throws wrapped error on query failure', async () => {
    requestMock.mockRejectedValueOnce(new Error('network down'));
    const client = new SourcegraphClient({
      endpoint: 'https://sg.com',
      accessToken: 'abc',
      timeout: 1000,
      logLevel: 'info',
    });

    await expect(client.query('query { test }')).rejects.toThrow(
      'GraphQL query failed: network down',
    );
  });

  it('passes through non-error rejections', async () => {
    requestMock.mockRejectedValueOnce('totally-bad');
    const client = new SourcegraphClient({
      endpoint: 'https://sg.com',
      accessToken: 'abc',
      timeout: 1000,
      logLevel: 'info',
    });

    await expect(client.query('query { test }')).rejects.toBe('totally-bad');
  });

  it('handles queryWithErrorHandling success and failure', async () => {
    const client = new SourcegraphClient({
      endpoint: 'https://sg.com',
      accessToken: 'abc',
      timeout: 1000,
      logLevel: 'info',
    });

    const spy = vi.spyOn(client, 'query');
    spy.mockResolvedValueOnce({ value: 123 });
    const success = await client.queryWithErrorHandling('query { ok }', { value: 0 });
    expect(success).toEqual({ data: { value: 123 }, errors: [] });

    spy.mockRejectedValueOnce(new Error('boom'));
    const failure = await client.queryWithErrorHandling('query { ok }', { value: 0 });
    expect(failure).toEqual({ data: { value: 0 }, errors: ['boom'] });

    spy.mockRejectedValueOnce('bad');
    const stringFailure = await client.queryWithErrorHandling('query { ok }', { value: 1 });
    expect(stringFailure).toEqual({ data: { value: 1 }, errors: ['bad'] });
  });
});
