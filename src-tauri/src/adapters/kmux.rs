use kmux::agent::AgentName;
use kmux::catalog::{KeyAlias, KeyEntry};
use kmux::config::{Config, ConfigError, ConfigSnapshot, ConfigStore};
use kmux::management::{
    self, AddAgentRequest, AddKeyRequest, AgentStatus, ImportRequest, UpdateAgentRequest,
    UpdateKeyMetadataRequest,
};
use kmux::scope::ScopePath;
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;
use std::str::FromStr;
use std::time::Duration;

use crate::dto::{
    AgentDto, AgentIdentityDto, AgentListResponse, CatalogErrorDto, CatalogResponse, IdentityDto,
    ImportIdentityDto, ImportPreviewDto, ImportResponse, MutationResponse,
};

pub fn load_catalog() -> Result<CatalogResponse, CatalogErrorDto> {
    let config_path = discovered_path()?;
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

pub fn load_agents() -> Result<AgentListResponse, CatalogErrorDto> {
    let config_path = discovered_path()?;
    let config = Config::load(&config_path).map_err(map_config_error)?;
    let registered_fingerprints = config
        .catalog()
        .entries()
        .map(|entry| entry.fingerprint().to_string())
        .collect::<BTreeSet<_>>();
    let inspections = management::inspect_agents(&config, Duration::from_millis(800));
    let inspected_at_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let agents = inspections
        .into_iter()
        .map(|inspection| {
            let (status, announced_count, identities, error) = match inspection.status {
                AgentStatus::Available(identities) => (
                    "available".to_owned(),
                    Some(identities.len()),
                    identities
                        .into_iter()
                        .filter(|identity| {
                            !registered_fingerprints.contains(&identity.fingerprint.to_string())
                        })
                        .map(|identity| AgentIdentityDto {
                            fingerprint: identity.fingerprint.to_string(),
                            comment: identity.comment,
                        })
                        .collect::<Vec<_>>(),
                    None,
                ),
                AgentStatus::TimedOut => (
                    "timed-out".to_owned(),
                    None,
                    Vec::new(),
                    Some("timed-out".to_owned()),
                ),
                AgentStatus::Unavailable(_) => (
                    "unavailable".to_owned(),
                    None,
                    Vec::new(),
                    Some("unavailable".to_owned()),
                ),
                AgentStatus::ProtocolError(_) => (
                    "protocol-error".to_owned(),
                    None,
                    Vec::new(),
                    Some("protocol-error".to_owned()),
                ),
            };
            AgentDto {
                name: inspection.name.to_string(),
                socket: inspection.socket.display().to_string(),
                status,
                announced_count,
                available_count: error.is_none().then_some(identities.len()),
                identities,
                error,
                inspected_at_epoch_ms,
            }
        })
        .collect();
    Ok(AgentListResponse {
        config_path: config_path.display().to_string(),
        agents,
    })
}

pub fn prepare_agent_import(
    agent: String,
    scopes: Vec<String>,
) -> Result<(management::ImportPlan, ImportPreviewDto), CatalogErrorDto> {
    let path = discovered_path()?;
    let agent = AgentName::new(agent).map_err(|error| validation_error(error.to_string()))?;
    let snapshot = ConfigStore::load_versioned(&path).map_err(map_config_error)?;
    let config = snapshot.document().validate().map_err(map_config_error)?;
    let definition = config
        .agents()
        .get(&agent)
        .ok_or_else(|| validation_error("O agent selecionado não está cadastrado."))?;
    let identities = kmux::agent::UnixSocketAgent::new(definition.socket().to_owned())
        .identities_with_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| CatalogErrorDto {
            kind: "agent-unavailable".to_owned(),
            message: error.to_string(),
            current: None,
        })?;
    let scopes = scopes
        .iter()
        .map(|scope| ScopePath::from_str(scope).map_err(|_| validation_error("Invalid scope.")))
        .collect::<Result<Vec<_>, _>>()?;
    let plan = management::plan_import(
        snapshot,
        ImportRequest {
            agent,
            identities,
            scopes,
            tags: BTreeMap::new(),
        },
    )
    .map_err(map_config_error)?;
    let preview = ImportPreviewDto {
        plan_id: String::new(),
        config_path: path.display().to_string(),
        additions: plan
            .additions()
            .iter()
            .map(|entry| ImportIdentityDto {
                alias: entry.alias().to_string(),
                fingerprint: entry.fingerprint().to_string(),
                comment: entry.comment().map(str::to_owned),
            })
            .collect(),
        already_configured_count: plan.already_configured(),
    };
    Ok((plan, preview))
}

pub fn apply_agent_import(
    plan: &management::ImportPlan,
    config_path: String,
) -> Result<ImportResponse, CatalogErrorDto> {
    let imported_count = plan.additions().len();
    let already_configured_count = plan.already_configured();
    management::apply_import(plan).map_err(map_config_error)?;
    Ok(ImportResponse {
        config_path,
        imported_count,
        already_configured_count,
    })
}

pub fn add_agent(name: String, socket: String) -> Result<MutationResponse, CatalogErrorDto> {
    let path = discovered_path()?;
    let name = AgentName::new(name).map_err(|error| validation_error(error.to_string()))?;
    let socket = PathBuf::from(socket);
    if !socket.is_absolute() {
        return Err(validation_error(
            "O caminho do socket precisa ser absoluto.",
        ));
    }
    management::add_agent(&path, AddAgentRequest { name, socket }).map_err(map_config_error)?;
    Ok(MutationResponse {
        config_path: path.display().to_string(),
    })
}

pub fn update_agent_socket(
    name: String,
    socket: String,
) -> Result<MutationResponse, CatalogErrorDto> {
    let path = discovered_path()?;
    let name = AgentName::new(name).map_err(|error| validation_error(error.to_string()))?;
    let socket = PathBuf::from(socket);
    if !socket.is_absolute() {
        return Err(validation_error(
            "O caminho do socket precisa ser absoluto.",
        ));
    }
    management::update_agent_socket(&path, UpdateAgentRequest { name, socket })
        .map_err(map_config_error)?;
    Ok(MutationResponse {
        config_path: path.display().to_string(),
    })
}

pub fn remove_agent(name: String) -> Result<MutationResponse, CatalogErrorDto> {
    let path = discovered_path()?;
    let name = AgentName::new(name).map_err(|error| validation_error(error.to_string()))?;
    management::remove_agent(&path, name).map_err(map_config_error)?;
    Ok(MutationResponse {
        config_path: path.display().to_string(),
    })
}

pub fn add_identity(
    alias: String,
    agent: String,
    fingerprint: String,
    scopes: Vec<String>,
    tags: BTreeMap<String, String>,
    comment: Option<String>,
) -> Result<MutationResponse, CatalogErrorDto> {
    let path = discovered_path()?;
    let agent_name = AgentName::new(agent).map_err(|error| validation_error(error.to_string()))?;
    let alias = KeyAlias::new(alias).map_err(|error| validation_error(error.to_string()))?;
    let scopes = scopes
        .iter()
        .map(|scope| {
            ScopePath::from_str(scope).map_err(|error| validation_error(error.to_string()))
        })
        .collect::<Result<Vec<_>, _>>()?;
    validate_tags(&tags)?;

    let config = Config::load(&path).map_err(map_config_error)?;
    let configured_agent = config
        .agents()
        .get(&agent_name)
        .ok_or_else(|| validation_error("O agent selecionado não está cadastrado."))?;
    let identities = kmux::agent::UnixSocketAgent::new(configured_agent.socket().to_owned())
        .identities_with_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| CatalogErrorDto {
            kind: "agent-unavailable".to_owned(),
            message: error.to_string(),
            current: None,
        })?;
    let identity = identities
        .into_iter()
        .find(|identity| identity.fingerprint.to_string() == fingerprint)
        .ok_or_else(|| validation_error("A identidade não está mais anunciada pelo agent."))?;
    let entry =
        KeyEntry::new(alias, identity.fingerprint, agent_name, scopes, tags).with_comment(comment);
    management::add_key(&path, AddKeyRequest { entry }).map_err(map_config_error)?;
    Ok(MutationResponse {
        config_path: path.display().to_string(),
    })
}

pub fn remove_identity(alias: String) -> Result<MutationResponse, CatalogErrorDto> {
    let path = discovered_path()?;
    let alias = KeyAlias::new(alias).map_err(|error| validation_error(error.to_string()))?;
    management::remove_key(&path, alias).map_err(map_config_error)?;
    Ok(MutationResponse {
        config_path: path.display().to_string(),
    })
}

pub fn load_identity_snapshot(
    alias: String,
) -> Result<(ConfigSnapshot, IdentityDto), CatalogErrorDto> {
    let path = discovered_path()?;
    let snapshot = ConfigStore::load_versioned(&path).map_err(map_config_error)?;
    let config = snapshot.document().validate().map_err(map_config_error)?;
    let entry = config
        .catalog()
        .entries()
        .find(|entry| entry.alias().as_str() == alias)
        .ok_or_else(|| CatalogErrorDto {
            kind: "not-found".to_owned(),
            message: "A identidade selecionada não existe mais.".to_owned(),
            current: None,
        })?;
    let identity = IdentityDto {
        alias: entry.alias().to_string(),
        fingerprint: entry.fingerprint().to_string(),
        agent: entry.agent().to_string(),
        scopes: entry.scopes().iter().map(ToString::to_string).collect(),
        tags: entry.tags().clone(),
        comment: entry.comment().map(str::to_owned),
    };
    Ok((snapshot, identity))
}

pub fn update_identity_metadata(
    snapshot: ConfigSnapshot,
    alias: String,
    scopes: Vec<String>,
    tags: BTreeMap<String, String>,
    comment: Option<String>,
) -> Result<MutationResponse, CatalogErrorDto> {
    let alias = KeyAlias::new(alias).map_err(|error| validation_error(error.to_string()))?;
    let scopes = scopes
        .iter()
        .map(|scope| {
            ScopePath::from_str(scope).map_err(|error| validation_error(error.to_string()))
        })
        .collect::<Result<Vec<_>, _>>()?;
    validate_tags(&tags)?;
    let path = snapshot.source_path().to_owned();
    management::update_key_metadata_if_unchanged(
        &path,
        &snapshot,
        UpdateKeyMetadataRequest {
            alias,
            scopes,
            tags,
            comment,
        },
    )
    .map_err(map_config_error)?;
    Ok(MutationResponse {
        config_path: path.display().to_string(),
    })
}

fn discovered_path() -> Result<PathBuf, CatalogErrorDto> {
    Config::discover(None)
        .map(|path| path.as_path().to_owned())
        .map_err(map_config_error)
}

fn validate_tags(tags: &BTreeMap<String, String>) -> Result<(), CatalogErrorDto> {
    if tags
        .iter()
        .any(|(name, value)| name.trim().is_empty() || value.trim().is_empty())
    {
        return Err(validation_error(
            "Nomes e valores das tags não podem ficar vazios.",
        ));
    }
    Ok(())
}

fn validation_error(message: impl Into<String>) -> CatalogErrorDto {
    CatalogErrorDto {
        kind: "validation".to_owned(),
        message: message.into(),
        current: None,
    }
}

fn map_config_error(error: ConfigError) -> CatalogErrorDto {
    let (kind, message) = match error {
        ConfigError::Conflict(_) => (
            "conflict",
            "A configuração mudou desde que os dados foram carregados. Atualize e tente novamente."
                .to_owned(),
        ),
        ConfigError::AgentInUse(agent, aliases) => (
            "agent-in-use",
            format!("O agent {agent} ainda é usado por: {}.", aliases.join(", ")),
        ),
        ConfigError::UnknownAgent(agent) => ("not-found", format!("O agent {agent} não existe.")),
        ConfigError::UnknownKey(alias) => ("not-found", format!("A identidade {alias} não existe.")),
        ConfigError::DuplicateAgent(agent) => ("validation", format!("O agent {agent} já existe.")),
        ConfigError::Validation(message) => ("validation", message),
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
        ConfigError::Write { source, .. }
            if source.kind() == std::io::ErrorKind::PermissionDenied =>
        {
            ("permission-denied", "Permission denied.".to_owned())
        }
        ConfigError::Parse(_) => (
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

    CatalogErrorDto {
        kind: kind.to_owned(),
        message,
        current: None,
    }
}
