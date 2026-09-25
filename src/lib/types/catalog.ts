export interface IdentityDto {
  alias: string;
  fingerprint: string;
  agent: string;
  scopes: string[];
  tags: Record<string, string>;
  comment: string | null;
}

export interface CatalogResponse {
  configPath: string;
  agentCount: number;
  identities: IdentityDto[];
}

export interface CatalogError {
  kind: string;
  message: string;
}
