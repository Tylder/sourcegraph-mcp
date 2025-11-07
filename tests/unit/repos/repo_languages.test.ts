import { describe, it, expect, vi } from 'vitest';
import { repoLanguages, __internal } from '../../../src/tools/repos/repo_languages.js';
import type {
  RepoLanguageBreakdown,
  RepoLanguagesResult,
} from '../../../src/tools/repos/repo_languages.js';
import type { SourcegraphClient } from '../../../src/graphql/client.js';

describe('repoLanguages', () => {
  it('returns normalized language breakdown as JSON', async () => {
    const query = vi.fn().mockResolvedValue({
      repository: {
        name: 'github.com/sourcegraph/sourcegraph',
        languageStatistics: [
          {
            name: 'TypeScript',
            displayName: 'TypeScript',
            color: '#3178c6',
            totalBytes: 1500,
            totalLines: 100,
          },
          {
            name: 'Go',
            displayName: 'Go',
            color: '#00ADD8',
            totalBytes: 500,
            totalLines: 40,
          },
          {
            name: 'JSON',
            displayName: 'JSON',
            color: '#292929',
            totalBytes: 200,
          },
        ],
      },
    });
    const mockClient = { query } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/sourcegraph/sourcegraph',
      rev: 'main',
    });

    expect(query).toHaveBeenCalledWith(expect.any(String), {
      name: 'github.com/sourcegraph/sourcegraph',
    });

    const parsed = JSON.parse(response) as RepoLanguagesResult;

    expect(parsed.repo).toBe('github.com/sourcegraph/sourcegraph');
    expect(parsed.revision).toBe('main');
    expect(parsed.totalBytes).toBe(2200);
    expect(parsed.languages).toHaveLength(3);
    expect(parsed.languages.map((language) => language.name)).toEqual(['TypeScript', 'Go', 'JSON']);

    const totalRatio = parsed.languages.reduce(
      (sum: number, language: { share: { ratio: number } }) => sum + language.share.ratio,
      0
    );
    expect(totalRatio).toBeCloseTo(1, 6);

    const totalPercentage = parsed.languages.reduce(
      (sum: number, language: { share: { percentage: number } }) => sum + language.share.percentage,
      0
    );
    expect(totalPercentage).toBeCloseTo(100, 2);

    const [typescript, goLang] = parsed.languages;
    expect(typescript.displayName).toBe('TypeScript');
    expect(typescript.share.percentage).toBeGreaterThan(goLang.share.percentage);
    expect(goLang.totalLines).toBe(40);
  });

  it('handles repositories with zero language bytes', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/empty',
          languageStatistics: [
            {
              name: 'Unknown',
              displayName: 'Unknown',
              color: null,
              totalBytes: 0,
            },
          ],
        },
      }),
    } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/example/empty',
    });

    const parsed = JSON.parse(response) as RepoLanguagesResult;
    expect(parsed.totalBytes).toBe(0);
    expect(parsed.languages[0].share.ratio).toBe(0);
    expect(parsed.languages[0].share.percentage).toBe(0);
  });

  it('handles repositories that omit language statistics', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/nostats',
          languageStatistics: null,
        },
      }),
    } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/example/nostats',
    });

    const parsed = JSON.parse(response) as RepoLanguagesResult;
    expect(parsed.totalBytes).toBe(0);
    expect(parsed.languages).toEqual([]);
  });

  it('indicates when language statistics are unsupported', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        repository: {
          name: 'github.com/example/unsupported',
        },
      }),
    } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/example/unsupported',
      rev: 'deadbeef',
    });

    expect(response).toContain('Language statistics are not supported');
    expect(response).toContain('github.com/example/unsupported');
    expect(response).toContain('deadbeef');
  });

  it('returns error message when repository is missing', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ repository: null }),
    } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/missing/repo',
    });

    expect(response).toBe('Repository not found: github.com/missing/repo');
  });

  it('handles GraphQL errors gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('GraphQL failure')),
    } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/example/repo',
    });

    expect(response).toBe('Error fetching repository languages: GraphQL failure');
  });

  it('coerces non-error GraphQL rejections into strings', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue('connection reset'),
    } as unknown as SourcegraphClient;

    const response = await repoLanguages(mockClient, {
      repo: 'github.com/example/repo',
    });

    expect(response).toBe('Error fetching repository languages: connection reset');
  });
});

describe('normalizeShares', () => {
  it('returns an empty array when no languages are provided', () => {
    expect(__internal.normalizeShares([])).toEqual([]);
  });

  it('returns zero shares when total bytes are zero', () => {
    const breakdown: RepoLanguageBreakdown[] = [
      {
        name: 'LangA',
        displayName: 'LangA',
        totalBytes: 0,
        share: { ratio: 0, percentage: 0 },
      },
      {
        name: 'LangB',
        displayName: 'LangB',
        totalBytes: 0,
        share: { ratio: 0, percentage: 0 },
      },
    ];

    const normalized = __internal.normalizeShares(breakdown);

    expect(normalized[0]?.share).toEqual({ ratio: 0, percentage: 0 });
    expect(normalized[1]?.share).toEqual({ ratio: 0, percentage: 0 });
  });

  it('adjusts rounding differences to keep totals consistent', () => {
    const breakdown: RepoLanguageBreakdown[] = [
      {
        name: 'LangA',
        displayName: 'LangA',
        totalBytes: 1,
        share: { ratio: 0, percentage: 0 },
      },
      {
        name: 'LangB',
        displayName: 'LangB',
        totalBytes: 1,
        share: { ratio: 0, percentage: 0 },
      },
      {
        name: 'LangC',
        displayName: 'LangC',
        totalBytes: 1,
        share: { ratio: 0, percentage: 0 },
      },
    ];

    const normalized = __internal.normalizeShares(breakdown);

    const ratioTotal = normalized.reduce((sum, item) => sum + item.share.ratio, 0);
    const percentageTotal = normalized.reduce((sum, item) => sum + item.share.percentage, 0);

    expect(ratioTotal).toBeCloseTo(1, 6);
    expect(percentageTotal).toBeCloseTo(100, 2);
  });

  it('anchors rounding corrections to the largest language regardless of array order', () => {
    const breakdown: RepoLanguageBreakdown[] = [
      {
        name: 'TinyA',
        displayName: 'TinyA',
        totalBytes: 1,
        share: { ratio: 0, percentage: 0 },
      },
      {
        name: 'TinyB',
        displayName: 'TinyB',
        totalBytes: 1,
        share: { ratio: 0, percentage: 0 },
      },
      {
        name: 'Largest',
        displayName: 'Largest',
        totalBytes: 4,
        share: { ratio: 0, percentage: 0 },
      },
    ];

    const normalized = __internal.normalizeShares(breakdown);

    expect(normalized[2]?.share.percentage).toBeGreaterThan(normalized[0]?.share.percentage);

    const percentageTotal = normalized.reduce((sum, item) => sum + item.share.percentage, 0);
    expect(percentageTotal).toBeCloseTo(100, 2);
  });
});

describe('buildBreakdown', () => {
  it('sanitizes language statistics and normalizes ordering', () => {
    const breakdown = __internal.buildBreakdown('github.com/example/repo', 'rev-1', [
      {
        name: 'TrimmedColor',
        displayName: '  Trimmed Color  ',
        color: '#123456 ',
        totalBytes: 10,
        totalLines: 5,
      },
      {
        name: 'FallbackName',
        displayName: '   ',
        color: '   ',
        totalBytes: 200,
        totalLines: Number.NaN,
      },
      {
        name: 'ZeroByte',
        displayName: 'ZeroByte',
        color: '#ffffff',
        totalBytes: 0,
        totalLines: 1,
      },
      {
        name: 'IgnoredNegative',
        displayName: 'IgnoredNegative',
        color: '#000000',
        totalBytes: -10,
      },
    ]);

    expect(breakdown.repo).toBe('github.com/example/repo');
    expect(breakdown.revision).toBe('rev-1');
    expect(breakdown.totalBytes).toBe(210);
    expect(breakdown.languages.map((language) => language.name)).toEqual([
      'FallbackName',
      'TrimmedColor',
      'ZeroByte',
    ]);

    const [fallback, trimmed, zeroByte] = breakdown.languages;

    expect(fallback.displayName).toBe('FallbackName');
    expect(fallback.color).toBeUndefined();

    expect(trimmed.displayName).toBe('Trimmed Color');
    expect(trimmed.color).toBe('#123456');
    expect(trimmed.totalLines).toBe(5);

    expect(zeroByte.share).toEqual({ ratio: 0, percentage: 0 });

    const totalSharePercentage = breakdown.languages.reduce(
      (sum, language) => sum + language.share.percentage,
      0
    );
    expect(totalSharePercentage).toBeCloseTo(100, 2);
  });
});
