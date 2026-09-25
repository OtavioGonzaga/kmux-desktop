use serde::Serialize;
use std::collections::BTreeMap;

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
    pub kind: &'static str,
    pub message: String,
}
