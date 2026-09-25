use kmux::config::{Config, ConfigError};

use crate::dto::{CatalogErrorDto, CatalogResponse, IdentityDto};

pub fn load_catalog() -> Result<CatalogResponse, CatalogErrorDto> {
    let path = Config::discover(None).map_err(map_config_error)?;
    let config_path = path.as_path().to_owned();
    let config = Config::load(&config_path).map_err(map_config_error)?;

    let identities = config
        .catalog()
        .entries()
        .map(|entry| IdentityDto {
            alias: entry.alias().to_string(),
            fingerprint: entry.fingerprint().to_string(),
            agent: entry.agent().to_string(),
            scopes: entry.scopes().iter().map(ToString::to_string).collect(),
            tags: entry.tags().clone(),
            comment: entry.comment().map(str::to_owned),
        })
        .collect();

    Ok(CatalogResponse {
        config_path: config_path.display().to_string(),
        agent_count: config.agents().len(),
        identities,
    })
}

fn map_config_error(error: ConfigError) -> CatalogErrorDto {
    let (kind, message) = match error {
        ConfigError::ConfigNotFound(path) => (
            "config-not-found",
            format!("Nenhum arquivo de configuração encontrado em {}.", path.display()),
        ),
        ConfigError::AmbiguousConfig(_) => (
            "ambiguous-config",
            "Mais de um arquivo de configuração foi encontrado. Defina KMUX_CONFIG para escolher um.".to_owned(),
        ),
        ConfigError::Read { .. } | ConfigError::ConfigHomeUnavailable => (
            "config-unavailable",
            "Não foi possível acessar ou localizar a configuração do kmux.".to_owned(),
        ),
        ConfigError::Parse(_) | ConfigError::Validation(_) => (
            "invalid-config",
            "A configuração do kmux tem formato inválido ou dados inconsistentes.".to_owned(),
        ),
        ConfigError::UnsupportedFormat(_) | ConfigError::UnsupportedVersion(_) => (
            "unsupported-config",
            "O formato ou a versão desta configuração não é suportado.".to_owned(),
        ),
        _ => (
            "config-error",
            "Não foi possível carregar a configuração do kmux.".to_owned(),
        ),
    };

    CatalogErrorDto { kind, message }
}
