import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, validateConfig } from '../../src/config.js';

describe('getConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default values when env vars not set', () => {
    process.env.SRC_ACCESS_TOKEN = 'test-token';
    delete process.env.SRC_ENDPOINT;
    delete process.env.TIMEOUT_MS;
    delete process.env.LOG_LEVEL;

    const config = getConfig();

    expect(config.endpoint).toBe('https://sourcegraph.com');
    expect(config.timeout).toBe(30000);
    expect(config.logLevel).toBe('info');
  });

  it('should use env vars when set', () => {
    process.env.SRC_ENDPOINT = 'http://localhost:7080';
    process.env.SRC_ACCESS_TOKEN = 'test-token';
    process.env.TIMEOUT_MS = '5000';
    process.env.LOG_LEVEL = 'debug';

    const config = getConfig();

    expect(config.endpoint).toBe('http://localhost:7080');
    expect(config.accessToken).toBe('test-token');
    expect(config.timeout).toBe(5000);
    expect(config.logLevel).toBe('debug');
  });

  it('should throw when access token is missing', () => {
    delete process.env.SRC_ACCESS_TOKEN;

    expect(() => getConfig()).toThrow('SRC_ACCESS_TOKEN environment variable is required');
  });
});

describe('validateConfig', () => {
  it('should pass for valid config', () => {
    const config = {
      endpoint: 'https://sourcegraph.com',
      accessToken: 'test-token',
      timeout: 30000,
      logLevel: 'info' as const,
    };

    expect(() => {
      validateConfig(config);
    }).not.toThrow();
  });

  it('should throw for invalid endpoint URL', () => {
    const config = {
      endpoint: 'not-a-url',
      accessToken: 'test-token',
      timeout: 30000,
      logLevel: 'info' as const,
    };

    expect(() => {
      validateConfig(config);
    }).toThrow('Invalid Sourcegraph endpoint URL');
  });

  it('should throw for missing endpoint', () => {
    const config = {
      endpoint: '',
      accessToken: 'test-token',
      timeout: 30000,
      logLevel: 'info' as const,
    };

    expect(() => {
      validateConfig(config);
    }).toThrow('Sourcegraph endpoint is required');
  });

  it('should throw for missing access token', () => {
    const config = {
      endpoint: 'https://sourcegraph.com',
      accessToken: '',
      timeout: 30000,
      logLevel: 'info' as const,
    };

    expect(() => {
      validateConfig(config);
    }).toThrow('Sourcegraph access token is required');
  });
});
