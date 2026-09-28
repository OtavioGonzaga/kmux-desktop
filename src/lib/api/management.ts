import { invoke } from "@tauri-apps/api/core";
import type {
  AgentListResponse,
  IdentitySnapshotDto,
  ImportPreviewDto,
  ImportResponse,
  MutationResponse,
} from "../types/management";

export const getAgents = (_refreshKey?: number) => invoke<AgentListResponse>("get_agents");

export const addAgent = (name: string, socket: string) =>
  invoke<MutationResponse>("add_agent", { name, socket });

export const updateAgentSocket = (name: string, socket: string) =>
  invoke<MutationResponse>("update_agent_socket", { name, socket });

export const removeAgent = (name: string) => invoke<MutationResponse>("remove_agent", { name });

export const addIdentity = (input: {
  alias: string;
  agent: string;
  fingerprint: string;
  scopes: string[];
  tags: Record<string, string>;
  comment: string | null;
}) => invoke<MutationResponse>("add_identity", input);

export const prepareAgentImport = (agent: string, scopes: string[]) =>
  invoke<ImportPreviewDto>("prepare_agent_import", { agent, scopes });

export const applyAgentImport = (planId: string) =>
  invoke<ImportResponse>("apply_agent_import", { planId });

export const removeIdentity = (alias: string) =>
  invoke<MutationResponse>("remove_identity", { alias });

export const getIdentitySnapshot = (alias: string) =>
  invoke<IdentitySnapshotDto>("get_identity_snapshot", { alias });

export const updateIdentityMetadata = (input: {
  snapshotId: string;
  alias: string;
  scopes: string[];
  tags: Record<string, string>;
  comment: string | null;
}) => invoke<MutationResponse>("update_identity_metadata", input);
