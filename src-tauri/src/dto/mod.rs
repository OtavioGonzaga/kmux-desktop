use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDto {
    pub name: String,
    pub socket: String,
    pub status: String,
    pub identity_count: Option<usize>,
    pub identities: Vec<AgentIdentityDto>,
    pub error: Option<String>,
    pub inspected_at_epoch_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentIdentityDto {
    pub fingerprint: String,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentListResponse {
    pub config_path: String,
    pub agents: Vec<AgentDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationResponse {
    pub config_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentitySnapshotDto {
    pub snapshot_id: String,
    pub identity: IdentityDto,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogResponse {
    pub config_path: String,
    pub agent_count: usize,
    pub identities: Vec<IdentityDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityDto {
    pub alias: String,
    pub fingerprint: String,
    pub agent: String,
    pub scopes: Vec<String>,
    pub tags: BTreeMap<String, String>,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogErrorDto {
    pub kind: String,
    pub message: String,
    pub current: Option<Box<IdentitySnapshotDto>>,
}
