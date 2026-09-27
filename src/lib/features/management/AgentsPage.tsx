import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Pencil, Plus, RefreshCw, Server, Trash2, X } from "lucide-react";
import {
  addAgent,
  addIdentity,
  getAgents,
  removeAgent,
  updateAgentSocket,
} from "../../api/management";
import type { AgentDto } from "../../types/management";

type AgentForm = { name: string; socket: string };
type IdentityForm = {
  agent: AgentDto;
  fingerprint: string;
  alias: string;
  scopes: string;
  tags: string;
  comment: string;
};

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

function parseTags(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator < 1 || separator === line.length - 1) {
          throw new Error("Use uma linha por tag no formato chave=valor.");
        }
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

export default function AgentsPage({ onCatalogChanged }: { onCatalogChanged: () => void }) {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<AgentDto[]>([]);
  const [configPath, setConfigPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agentForm, setAgentForm] = useState<AgentForm | null>(null);
  const [identityForm, setIdentityForm] = useState<IdentityForm | null>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const result = await getAgents();
      setAgents(result.agents);
      setConfigPath(result.configPath);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getAgents()
      .then((result) => {
        if (!active) return;
        setAgents(result.agents);
        setConfigPath(result.configPath);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agentForm) return;
    setBusy(true);
    setError("");
    try {
      if (agentForm.name.trim() && agents.some((agent) => agent.name === agentForm.name)) {
        await updateAgentSocket(agentForm.name, agentForm.socket.trim());
      } else {
        await addAgent(agentForm.name.trim(), agentForm.socket.trim());
      }
      setAgentForm(null);
      await refresh();
      onCatalogChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAgent(agent: AgentDto) {
    if (!window.confirm(t("confirmRemoveAgent", { name: agent.name }))) return;
    setBusy(true);
    setError("");
    try {
      await removeAgent(agent.name);
      await refresh();
      onCatalogChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identityForm) return;
    setBusy(true);
    setError("");
    try {
      await addIdentity({
        alias: identityForm.alias.trim(),
        agent: identityForm.agent.name,
        fingerprint: identityForm.fingerprint,
        scopes: identityForm.scopes
          .split(",")
          .map((scope) => scope.trim())
          .filter(Boolean),
        tags: parseTags(identityForm.tags),
        comment: identityForm.comment.trim() || null,
      });
      setIdentityForm(null);
      await refresh();
      onCatalogChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="management-page" aria-labelledby="agents-heading">
      <div className="management-heading">
        <div>
          <div className="eyebrow">{t("managementEyebrow")}</div>
          <h1 id="agents-heading">{t("agentsHeading")}</h1>
          <p>{t("agentsDescription")}</p>
        </div>
        <div className="management-actions">
          <button
            className="button button-secondary"
            onClick={() => void refresh()}
            disabled={loading || busy}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            {t("inspectAgents")}
          </button>
          <button
            className="button button-primary"
            onClick={() => setAgentForm({ name: "", socket: "" })}
          >
            <Plus size={15} />
            {t("addAgent")}
          </button>
        </div>
      </div>
      {configPath && (
        <p className="management-source">
          {t("source")} <code>{configPath}</code>
        </p>
      )}
      {error && (
        <div className="management-error" role="alert">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {loading ? (
        <div className="loading-panel">
          <RefreshCw size={20} className="spin" />
          <span>{t("loadingAgents")}</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="management-empty">
          <Server size={24} />
          <h2>{t("noAgentsTitle")}</h2>
          <p>{t("noAgentsDescription")}</p>
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map((agent) => (
            <article className="agent-card" key={agent.name}>
              <div className="agent-card-header">
                <span className="agent-card-icon">
                  <Server size={19} />
                </span>
                <div className="agent-card-title">
                  <h2>{agent.name}</h2>
                  <span className={`agent-status status-${agent.status}`}>
                    {t(`agentStatus_${agent.status}`)}
                  </span>
                </div>
                <div className="agent-card-controls">
                  <button
                    className="icon-button"
                    aria-label={t("editSocket")}
                    title={t("editSocket")}
                    onClick={() => setAgentForm({ name: agent.name, socket: agent.socket })}
                    disabled={busy}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button danger-control"
                    aria-label={t("removeAgent")}
                    title={t("removeAgent")}
                    onClick={() => void deleteAgent(agent)}
                    disabled={busy}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="agent-socket">
                <span>{t("socketPath")}</span>
                <code title={agent.socket}>{agent.socket}</code>
                <span>
                  {t("lastInspected", {
                    time: new Date(agent.inspectedAtEpochMs).toLocaleTimeString(),
                  })}
                </span>
              </div>
              {agent.error && <p className="agent-error-text">{agent.error}</p>}
              <div className="agent-identities-heading">
                <strong>{t("announcedIdentities", { count: agent.identityCount ?? 0 })}</strong>
              </div>
              {agent.identities.length > 0 ? (
                <div className="announced-identities">
                  {agent.identities.map((identity) => (
                    <div className="announced-identity" key={identity.fingerprint}>
                      <div>
                        <code>{identity.fingerprint}</code>
                        {identity.comment && <span>{identity.comment}</span>}
                      </div>
                      <button
                        className="button button-secondary button-small"
                        onClick={() =>
                          setIdentityForm({
                            agent,
                            fingerprint: identity.fingerprint,
                            alias: "",
                            scopes: "",
                            tags: "",
                            comment: identity.comment ?? "",
                          })
                        }
                        disabled={busy}
                      >
                        <Plus size={13} />
                        {t("registerIdentity")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : agent.status === "available" ? (
                <p className="field-empty">{t("noAnnouncedIdentities")}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {agentForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAgentForm(null);
          }}
        >
          <dialog
            open
            className="settings-modal management-modal"
            aria-modal="true"
            aria-labelledby="agent-form-title"
          >
            <header>
              <h2 id="agent-form-title">
                {agentForm.name ? t("editAgentTitle") : t("addAgentTitle")}
              </h2>
              <button
                className="icon-button"
                onClick={() => setAgentForm(null)}
                aria-label={t("close")}
              >
                <X size={17} />
              </button>
            </header>
            <form onSubmit={(event) => void saveAgent(event)}>
              <label className="preference-field">
                <span>{t("agentName")}</span>
                <input
                  required
                  minLength={1}
                  maxLength={64}
                  pattern="[A-Za-z0-9._-]+"
                  value={agentForm.name}
                  disabled={Boolean(agentForm.name)}
                  onChange={(event) => setAgentForm({ ...agentForm, name: event.target.value })}
                />
              </label>
              <label className="preference-field">
                <span>{t("socketPath")}</span>
                <input
                  required
                  value={agentForm.socket}
                  placeholder="/run/user/1000/ssh-agent.sock"
                  onChange={(event) => setAgentForm({ ...agentForm, socket: event.target.value })}
                />
              </label>
              {error && (
                <p className="management-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setAgentForm(null)}
                >
                  {t("cancel")}
                </button>
                <button className="button button-primary" type="submit" disabled={busy}>
                  <Check size={15} />
                  {busy ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}

      {identityForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIdentityForm(null);
          }}
        >
          <dialog
            open
            className="settings-modal management-modal"
            aria-modal="true"
            aria-labelledby="identity-form-title"
          >
            <header>
              <h2 id="identity-form-title">{t("registerIdentityTitle")}</h2>
              <button
                className="icon-button"
                onClick={() => setIdentityForm(null)}
                aria-label={t("close")}
              >
                <X size={17} />
              </button>
            </header>
            <form onSubmit={(event) => void saveIdentity(event)}>
              <p className="form-context">
                {identityForm.agent.name} · <code>{identityForm.fingerprint}</code>
              </p>
              <label className="preference-field">
                <span>{t("aliasLabel")}</span>
                <input
                  required
                  minLength={1}
                  maxLength={64}
                  pattern="[A-Za-z0-9._-]+"
                  value={identityForm.alias}
                  onChange={(event) =>
                    setIdentityForm({ ...identityForm, alias: event.target.value })
                  }
                />
              </label>
              <label className="preference-field">
                <span>{t("scopesInput")}</span>
                <input
                  value={identityForm.scopes}
                  placeholder="work/prod, company"
                  onChange={(event) =>
                    setIdentityForm({ ...identityForm, scopes: event.target.value })
                  }
                />
              </label>
              <label className="preference-field">
                <span>{t("tagsInput")}</span>
                <textarea
                  rows={3}
                  value={identityForm.tags}
                  placeholder={"provider=aws\nenvironment=production"}
                  onChange={(event) =>
                    setIdentityForm({ ...identityForm, tags: event.target.value })
                  }
                />
              </label>
              <label className="preference-field">
                <span>{t("comment")}</span>
                <input
                  value={identityForm.comment}
                  onChange={(event) =>
                    setIdentityForm({ ...identityForm, comment: event.target.value })
                  }
                />
              </label>
              {error && (
                <p className="management-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setIdentityForm(null)}
                >
                  {t("cancel")}
                </button>
                <button className="button button-primary" type="submit" disabled={busy}>
                  <Check size={15} />
                  {busy ? t("saving") : t("registerIdentity")}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </section>
  );
}
