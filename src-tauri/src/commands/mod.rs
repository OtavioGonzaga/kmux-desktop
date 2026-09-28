use crate::adapters::kmux;
use crate::app_state::AppState;
use crate::dto::{
    AgentListResponse, CatalogErrorDto, CatalogResponse, IdentitySnapshotDto, ImportPreviewDto,
    ImportResponse, MutationResponse,
};
use std::collections::BTreeMap;
use tauri::State;

#[tauri::command]
pub async fn get_catalog() -> Result<CatalogResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(kmux::load_catalog)
        .await
        .map_err(|_| CatalogErrorDto {
            kind: "internal-error".to_owned(),
            message: "O carregamento do catálogo foi interrompido.".to_owned(),
            current: None,
            references: None,
        })?
}

#[tauri::command]
pub async fn get_agents() -> Result<AgentListResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(kmux::load_agents)
        .await
        .map_err(|_| internal_error("A inspeção dos agents foi interrompida."))?
}

#[tauri::command]
pub async fn add_agent(name: String, socket: String) -> Result<MutationResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(move || kmux::add_agent(name, socket))
        .await
        .map_err(|_| internal_error("O cadastro do agent foi interrompido."))?
}

#[tauri::command]
pub async fn update_agent_socket(
    name: String,
    socket: String,
) -> Result<MutationResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(move || kmux::update_agent_socket(name, socket))
        .await
        .map_err(|_| internal_error("A atualização do socket foi interrompida."))?
}

#[tauri::command]
pub async fn remove_agent(name: String) -> Result<MutationResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(move || kmux::remove_agent(name))
        .await
        .map_err(|_| internal_error("A remoção do agent foi interrompida."))?
}

#[tauri::command]
pub async fn add_identity(
    alias: String,
    agent: String,
    fingerprint: String,
    scopes: Vec<String>,
    tags: BTreeMap<String, String>,
    comment: Option<String>,
) -> Result<MutationResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(move || {
        kmux::add_identity(alias, agent, fingerprint, scopes, tags, comment)
    })
    .await
    .map_err(|_| internal_error("O cadastro da identidade foi interrompido."))?
}

#[tauri::command]
pub async fn prepare_agent_import(
    agent: String,
    scopes: Vec<String>,
    app_state: State<'_, AppState>,
) -> Result<ImportPreviewDto, CatalogErrorDto> {
    let (plan, mut preview) =
        tauri::async_runtime::spawn_blocking(move || kmux::prepare_agent_import(agent, scopes))
            .await
            .map_err(|_| internal_error("Import preparation was interrupted."))??;
    preview.plan_id = app_state.insert_import_plan(plan, preview.config_path.clone());
    Ok(preview)
}

#[tauri::command]
pub async fn apply_agent_import(
    plan_id: String,
    app_state: State<'_, AppState>,
) -> Result<ImportResponse, CatalogErrorDto> {
    let (plan, config_path) =
        app_state
            .take_import_plan(&plan_id)
            .ok_or_else(|| CatalogErrorDto {
                kind: "snapshot-expired".to_owned(),
                message: "The import preview expired.".to_owned(),
                current: None,
                references: None,
            })?;
    tauri::async_runtime::spawn_blocking(move || kmux::apply_agent_import(&plan, config_path))
        .await
        .map_err(|_| internal_error("Import application was interrupted."))?
}

#[tauri::command]
pub async fn remove_identity(alias: String) -> Result<MutationResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(move || kmux::remove_identity(alias))
        .await
        .map_err(|_| internal_error("A remoção da identidade foi interrompida."))?
}

#[tauri::command]
pub async fn get_identity_snapshot(
    alias: String,
    app_state: State<'_, AppState>,
) -> Result<IdentitySnapshotDto, CatalogErrorDto> {
    let (snapshot, identity) =
        tauri::async_runtime::spawn_blocking(move || kmux::load_identity_snapshot(alias))
            .await
            .map_err(|_| internal_error("A leitura da identidade foi interrompida."))??;
    let snapshot_id = app_state.insert_snapshot(snapshot);
    Ok(IdentitySnapshotDto {
        snapshot_id,
        identity,
    })
}

#[tauri::command]
pub async fn update_identity_metadata(
    snapshot_id: String,
    alias: String,
    scopes: Vec<String>,
    tags: BTreeMap<String, String>,
    comment: Option<String>,
    app_state: State<'_, AppState>,
) -> Result<MutationResponse, CatalogErrorDto> {
    let snapshot = app_state
        .get_snapshot(&snapshot_id)
        .ok_or_else(|| CatalogErrorDto {
            kind: "snapshot-expired".to_owned(),
            message: "A sessão de edição expirou. Abra a identidade novamente.".to_owned(),
            current: None,
            references: None,
        })?;
    let alias_for_refresh = alias.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        kmux::update_identity_metadata(snapshot, alias, scopes, tags, comment)
    })
    .await
    .map_err(|_| internal_error("A atualização dos metadados foi interrompida."))?;
    match result {
        Ok(result) => {
            app_state.remove_snapshot(&snapshot_id);
            Ok(result)
        }
        Err(mut error) => {
            if error.kind == "conflict"
                && let Ok(Ok((snapshot, identity))) =
                    tauri::async_runtime::spawn_blocking(move || {
                        kmux::load_identity_snapshot(alias_for_refresh)
                    })
                    .await
            {
                error.current = Some(Box::new(IdentitySnapshotDto {
                    snapshot_id: app_state.insert_snapshot(snapshot),
                    identity,
                }));
            }
            Err(error)
        }
    }
}

fn internal_error(message: &str) -> CatalogErrorDto {
    CatalogErrorDto {
        kind: "internal-error".to_owned(),
        message: message.to_owned(),
        current: None,
        references: None,
    }
}
