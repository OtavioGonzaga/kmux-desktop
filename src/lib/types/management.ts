export interface AgentIdentityDto {
  fingerprint: string;
  comment: string | null;
}

export interface AgentDto {
  name: string;
  socket: string;
  status: "available" | "unavailable" | "timed-out" | "protocol-error";
  announcedCount: number | null;
  availableCount: number | null;
  identities: AgentIdentityDto[];
  error: string | null;
  inspectedAtEpochMs: number;
}

export interface AgentListResponse {
  configPath: string;
  agents: AgentDto[];
}

export interface MutationResponse {
  configPath: string;
}

export interface ImportResponse extends MutationResponse {
  importedCount: number;
  alreadyConfiguredCount: number;
}

export interface ImportPreviewDto {
  planId: string;
  configPath: string;
  additions: Array<{ alias: string; fingerprint: string; comment: string | null }>;
  alreadyConfiguredCount: number;
}

export interface IdentitySnapshotDto {
  snapshotId: string;
  identity: import("./catalog").IdentityDto;
}

export type ManagementError = {
  kind: string;
  message: string;
  current?: IdentitySnapshotDto | null;
};
