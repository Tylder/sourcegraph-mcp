/**
 * File retrieval tool
 */

import type { SourcegraphClient } from '../../graphql/client.js';
import { FILE_CONTENT_QUERY } from '../../graphql/queries/file.js';

interface FileContentResponse {
  repository: {
    name: string;
    url: string;
    commit: {
      oid: string;
      blob: {
        path: string | null;
        content: string | null;
        byteSize: number | null;
        isBinary: boolean;
        highlight?: {
          aborted?: boolean;
          language?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
}

export interface FileGetParams {
  repo: string;
  path: string;
  rev?: string;
}

const UNKNOWN_LANGUAGE = 'unknown';
const UNKNOWN_SIZE = 'unknown';

function formatLanguage(language: string | null | undefined): string {
  return language?.trim() ? language : UNKNOWN_LANGUAGE;
}

function formatSize(byteSize: number | null | undefined): string {
  return typeof byteSize === 'number' && Number.isFinite(byteSize)
    ? `${byteSize.toString()} bytes`
    : UNKNOWN_SIZE;
}

function buildMetadata({
  repositoryName,
  repositoryUrl,
  requestedPath,
  reportedPath,
  revisionLabel,
  revisionOid,
  byteSize,
  language,
}: {
  repositoryName: string;
  repositoryUrl: string;
  requestedPath: string;
  reportedPath: string | null;
  revisionLabel: string;
  revisionOid: string;
  byteSize: number | null | undefined;
  language: string | null | undefined;
}): string[] {
  return [
    `Repository: ${repositoryName}`,
    `Repository URL: ${repositoryUrl}`,
    `Path: ${reportedPath ?? requestedPath}`,
    `Revision Requested: ${revisionLabel}`,
    `Revision OID: ${revisionOid}`,
    `Size: ${formatSize(byteSize)}`,
    `Language: ${formatLanguage(language)}`,
  ];
}

export async function fileGet(client: SourcegraphClient, params: FileGetParams): Promise<string> {
  const { repo, path, rev } = params;

  const variables: { repo: string; path: string; rev?: string } = {
    repo,
    path,
  };

  if (rev) {
    variables.rev = rev;
  }

  try {
    const response = await client.query<FileContentResponse>(FILE_CONTENT_QUERY, variables);

    if (!response.repository) {
      return `Repository ${repo} not found.`;
    }

    const commit = response.repository.commit;
    const revisionLabel = rev ?? 'HEAD';

    if (!commit) {
      return `Revision ${revisionLabel} not found in ${repo}.`;
    }

    const blob = commit.blob;

    if (!blob) {
      return `File ${path} not found at ${revisionLabel} in ${repo}.`;
    }

    const metadataLines = buildMetadata({
      repositoryName: response.repository.name,
      repositoryUrl: response.repository.url,
      requestedPath: path,
      reportedPath: blob.path,
      revisionLabel,
      revisionOid: commit.oid,
      byteSize: blob.byteSize,
      language: blob.highlight?.language,
    });

    if (blob.highlight?.aborted) {
      metadataLines.push('Warning: Syntax highlighting was aborted due to timeout.');
    }

    if (blob.isBinary) {
      metadataLines.push('', 'Warning: Binary file content is not displayed.');
      return `${metadataLines.join('\n')}\n`;
    }

    if (!blob.content) {
      metadataLines.push('', 'No content available for this file.');
      return `${metadataLines.join('\n')}\n`;
    }

    metadataLines.push('', blob.content);

    return metadataLines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error retrieving file: ${message}`;
  }
}
