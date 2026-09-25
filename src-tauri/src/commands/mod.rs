use crate::adapters::kmux;
use crate::dto::{CatalogErrorDto, CatalogResponse};

#[tauri::command]
pub async fn get_catalog() -> Result<CatalogResponse, CatalogErrorDto> {
    tauri::async_runtime::spawn_blocking(kmux::load_catalog)
        .await
        .map_err(|_| CatalogErrorDto {
            kind: "internal-error",
            message: "O carregamento do catálogo foi interrompido.".to_owned(),
        })?
}
