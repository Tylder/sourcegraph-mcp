import type { SourcegraphClient } from '../../graphql/client.js';
import { REPO_LANGUAGES_QUERY } from '../../graphql/queries/repos.js';

interface LanguageStatisticNode {
  name: string;
  displayName?: string | null;
  color?: string | null;
  totalBytes: number;
  totalLines?: number | null;
  percentage?: number | null;
}

interface RepoLanguagesResponse {
  repository: {
    name: string;
    languageStatistics?: LanguageStatisticNode[] | null;
  } | null;
}

export interface RepoLanguagesParams {
  repo: string;
  rev?: string;
}

export interface NormalizedLanguageShare {
  ratio: number;
  percentage: number;
}

export interface RepoLanguageBreakdown {
  name: string;
  displayName: string;
  color?: string;
  totalBytes: number;
  totalLines?: number;
  share: NormalizedLanguageShare;
}

export interface RepoLanguagesResult {
  repo: string;
  revision: string;
  totalBytes: number;
  languages: RepoLanguageBreakdown[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const SHARE_RATIO_DECIMALS = 6;
const SHARE_PERCENT_DECIMALS = 2;

function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function findLargestLanguageIndex(languages: RepoLanguageBreakdown[]): number {
  let maxIndex = 0;
  let maxBytes = Number.NEGATIVE_INFINITY;

  let index = 0;
  for (const language of languages) {
    const bytes = language.totalBytes;

    if (bytes > maxBytes) {
      maxIndex = index;
      maxBytes = bytes;
    }

    index += 1;
  }

  return maxIndex;
}

function normalizeShares(languages: RepoLanguageBreakdown[]): RepoLanguageBreakdown[] {
  if (languages.length === 0) {
    return [];
  }

  const totalBytes = languages.reduce((sum, language) => sum + language.totalBytes, 0);

  if (totalBytes <= 0) {
    return languages.map((language) => ({
      ...language,
      share: { ratio: 0, percentage: 0 },
    }));
  }

  const indexToAdjust = findLargestLanguageIndex(languages);
  let ratioSum = 0;
  let percentageSum = 0;

  const normalized = languages.map((language) => {
    const ratio = roundToDecimals(language.totalBytes / totalBytes, SHARE_RATIO_DECIMALS);
    const percentage = roundToDecimals(ratio * 100, SHARE_PERCENT_DECIMALS);

    ratioSum += ratio;
    percentageSum += percentage;

    return {
      ...language,
      share: {
        ratio,
        percentage,
      },
    };
  });

  const ratioDifference = roundToDecimals(1 - ratioSum, SHARE_RATIO_DECIMALS);

  if (ratioDifference !== 0 && normalized[indexToAdjust]) {
    const language = normalized[indexToAdjust];
    const adjustedRatio = clamp(
      roundToDecimals(language.share.ratio + ratioDifference, SHARE_RATIO_DECIMALS),
      0,
      1
    );

    normalized[indexToAdjust] = {
      ...language,
      share: {
        ...language.share,
        ratio: adjustedRatio,
      },
    };
  }

  const percentageDifference = roundToDecimals(100 - percentageSum, SHARE_PERCENT_DECIMALS);

  if (percentageDifference !== 0 && normalized[indexToAdjust]) {
    const language = normalized[indexToAdjust];
    const adjustedPercentage = clamp(
      roundToDecimals(language.share.percentage + percentageDifference, SHARE_PERCENT_DECIMALS),
      0,
      100
    );

    normalized[indexToAdjust] = {
      ...language,
      share: {
        ...language.share,
        percentage: adjustedPercentage,
      },
    };
  }

  return normalized;
}

function buildBreakdown(
  repo: string,
  revision: string,
  stats: LanguageStatisticNode[]
): RepoLanguagesResult {
  const sanitized = stats
    .filter((stat) => isFiniteNumber(stat.totalBytes) && stat.totalBytes >= 0)
    .map<RepoLanguageBreakdown>((stat) => {
      const color = stat.color?.trim();

      return {
        name: stat.name,
        displayName: stat.displayName?.trim() ? stat.displayName.trim() : stat.name,
        color: color && color.length > 0 ? color : undefined,
        totalBytes: stat.totalBytes,
        totalLines: isFiniteNumber(stat.totalLines) ? stat.totalLines : undefined,
        share: { ratio: 0, percentage: 0 },
      };
    });

  const sorted = sanitized.sort((a, b) => b.totalBytes - a.totalBytes);
  const normalized = normalizeShares(sorted);
  const totalBytes = normalized.reduce((sum, language) => sum + language.totalBytes, 0);

  return {
    repo,
    revision,
    totalBytes,
    languages: normalized,
  };
}

export async function repoLanguages(
  client: SourcegraphClient,
  params: RepoLanguagesParams
): Promise<string> {
  const { repo } = params;
  const revision = params.rev ?? 'HEAD';

  try {
    const response = await client.query<RepoLanguagesResponse>(REPO_LANGUAGES_QUERY, {
      name: repo,
    });
    const repository = response.repository;

    if (!repository) {
      return `Repository not found: ${repo}`;
    }

    const stats = repository.languageStatistics ?? [];
    const result = buildBreakdown(repo, revision, stats);

    return `${JSON.stringify(result, null, 2)}\n`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching repository languages: ${message}`;
  }
}

export const __internal = {
  normalizeShares,
  buildBreakdown,
};
