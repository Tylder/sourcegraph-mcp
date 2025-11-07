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
        byteSize: number;
        isBinary: boolean;
        highlight?: {
          aborted?: boolean;
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

export async function fileGet(client: SourcegraphClient, params: FileGetParams): Promise<string> {
  const { repo, path, rev } = params;
  const revisionLabel = rev ?? 'HEAD';

  const variables: { repo: string; path: string; rev: string } = {
    repo,
    path,
    rev: revisionLabel,
  };

  try {
    const response = await client.query<FileContentResponse>(FILE_CONTENT_QUERY, variables);

    if (response.repository === null) {
      return `Repository ${repo} not found.`;
    }

    const { commit } = response.repository;

    if (commit === null) {
      return `Revision ${revisionLabel} not found in ${repo}.`;
    }

    const { blob } = commit;

    if (blob === null) {
      return `File ${path} not found at ${revisionLabel} in ${repo}.`;
    }

    const metadataLines: string[] = [
      `Repository: ${response.repository.name}`,
      `Repository URL: ${response.repository.url}`,
      `Path: ${blob.path ?? path}`,
      `Revision Requested: ${revisionLabel}`,
      `Revision OID: ${commit.oid}`,
      `Size: ${blob.byteSize.toString()} bytes`,
    ];

    if (blob.highlight?.aborted === true) {
      metadataLines.push('Warning: Syntax highlighting was aborted due to timeout.');
    }

    if (blob.isBinary) {
      metadataLines.push('', 'Warning: Binary file content is not displayed.');
      return `${metadataLines.join('\n')}\n`;
    }

    if (typeof blob.content !== 'string' || blob.content.length === 0) {
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
