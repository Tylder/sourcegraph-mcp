/**
 * TypeScript types for Sourcegraph GraphQL API responses
 */

export interface Repository {
  name: string;
  url: string;
  description?: string;
  defaultBranch?: {
    name: string;
    target: {
      oid: string;
    };
  };
  mirrorInfo?: {
    cloned: boolean;
    cloneInProgress: boolean;
    updatedAt: string;
  };
}

export interface SearchResult {
  repository: {
    name: string;
    url: string;
  };
  file: {
    path: string;
    url: string;
    content?: string;
  };
  lineMatches?: {
    lineNumber: number;
    offsetAndLengths: [number, number][];
    preview: string;
  }[];
}

export interface FileContent {
  content: string;
  binary: boolean;
  byteSize: number;
}

export interface GitTree {
  entries: {
    name: string;
    path: string;
    isDirectory: boolean;
    url: string;
  }[];
}

export interface CurrentUser {
  username: string;
  email: string;
  displayName?: string;
  organizations: {
    nodes: {
      name: string;
      displayName?: string;
    }[];
  };
}

export interface SiteInfo {
  productVersion: string;
  buildVersion: string;
  hasCodeIntelligence: boolean;
}
