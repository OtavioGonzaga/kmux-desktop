import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Command,
  Fingerprint,
  KeyRound,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { getCatalog } from "./lib/api/catalog";
import { filterIdentities } from "./lib/features/catalog/filter";
import type { CatalogError, CatalogResponse, IdentityDto } from "./lib/types/catalog";
import { supportedLanguages, type AppLanguage } from "./i18n/config";

type ThemePreference = "system" | "light" | "dark";
const languageNames: Record<AppLanguage, string> = {
  "pt-BR": "language_pt",
  "en-US": "language_en",
  es: "language_es",
  de: "language_de",
};
const isAppLanguage = (value: string): value is AppLanguage =>
  supportedLanguages.some((language) => language === value);
const isThemePreference = (value: string): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

function getTheme(): ThemePreference {
  const saved = localStorage.getItem("kmux.theme");
  return saved === "light" || saved === "dark" ? saved : "system";
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [error, setError] = useState<CatalogError | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAlias, setSelectedAlias] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(getTheme);
  const filtered = useMemo(
    () => filterIdentities(catalog?.identities ?? [], search),
    [catalog, search],
  );
  const selected =
    filtered.find((identity) => identity.alias === selectedAlias) ?? filtered[0] ?? null;
  const localizedError = error
    ? t(`error-${error.kind}`, {
        message: error.message.replace(/^.*? em (.+)\.$/, "$1"),
        defaultValue: error.message,
      })
    : undefined;

  async function refreshCatalog() {
    setLoading(true);
    setError(null);
    try {
      const result = await getCatalog();
      setCatalog(result);
      setSelectedAlias((previous) => previous ?? result.identities[0]?.alias ?? null);
    } catch (cause) {
      setCatalog(null);
      setError({
        kind:
          typeof cause === "object" && cause !== null && "kind" in cause
            ? String(cause.kind)
            : "catalog-error",
        message:
          typeof cause === "object" && cause !== null && "message" in cause
            ? String(cause.message)
            : String(cause),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getCatalog()
      .then((result) => {
        if (!active) return;
        setCatalog(result);
        setSelectedAlias((previous) => previous ?? result.identities[0]?.alias ?? null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError({
          kind:
            typeof cause === "object" && cause !== null && "kind" in cause
              ? String(cause.kind)
              : "catalog-error",
          message:
            typeof cause === "object" && cause !== null && "message" in cause
              ? String(cause.message)
              : String(cause),
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.title = t("title");
  }, [i18n.language, t]);

  const changeLanguage = (language: AppLanguage) => {
    localStorage.setItem("kmux.language", language);
    void i18n.changeLanguage(language);
  };
  const changeTheme = (value: ThemePreference) => {
    localStorage.setItem("kmux.theme", value);
    setTheme(value);
  };
  const initials = (identity: IdentityDto) => identity.alias.slice(0, 1).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={t("navLabel")}>
        <a className="brand" href="#catalog" aria-label={t("home")}>
          <span className="brand-copy">
            <img className="brand-logo brand-logo-light" src="/kmux-logo.png" alt="kmux" />
            <img className="brand-logo brand-logo-dark" src="/kmux-logo-light.png" alt="kmux" />
            <small>IDENTITY MANAGER</small>
          </span>
        </a>
        <div className="workspace-label">{t("workspace")}</div>
        <nav className="nav-list">
          <a className="nav-item active" href="#catalog" aria-current="page">
            <img className="kmux-icon kmux-icon-light" src="/kmux-icon.png" alt="" />
            <img className="kmux-icon kmux-icon-dark" src="/kmux-icon-light.png" alt="" />
            <span>{t("identities")}</span>
            {catalog && <span className="nav-count">{catalog.identities.length}</span>}
          </a>
          <button className="nav-item" disabled title={t("comingSoon")}>
            <Layers3 size={18} />
            <span>{t("scopes")}</span>
            <span className="soon">{t("comingSoon")}</span>
          </button>
          <button className="nav-item" disabled title={t("comingSoon")}>
            <Server size={18} />
            <span>{t("agents")}</span>
            <span className="soon">{t("comingSoon")}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-rule" />
          <button className="nav-item settings-trigger" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={18} />
            <span>{t("settings")}</span>
          </button>
          <div className="sidebar-note">
            <ShieldCheck size={15} />
            {t("privateKeys")}
          </div>
        </div>
      </aside>

      <main className="main-area" id="catalog">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{t("breadcrumb")}</span>
            <ChevronRight size={14} />
            <strong>{t("identities")}</strong>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label={t("refresh")}
              onClick={() => void refreshCatalog()}
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
          </div>
        </header>
        <section className="content-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{t("tagline")}</div>
              <h1>{t("heading")}</h1>
              <p className="heading-description">{t("headingDescription")}</p>
            </div>
            <div className="heading-meta">
              {catalog && (
                <span className="agent-pill">
                  <span className="status-dot" />
                  {t("agent", { count: catalog.agentCount })}
                </span>
              )}
            </div>
          </div>
          {error ? (
            <section className="error-panel" role="alert">
              <div className="error-icon">
                <AlertCircle size={21} />
              </div>
              <div className="error-copy">
                <h2>{error.kind === "config-not-found" ? t("configNotFound") : t("loadError")}</h2>
                <p>{localizedError}</p>
                {error.kind === "config-not-found" && (
                  <p className="error-help">{t("configHelp")}</p>
                )}
              </div>
              <button className="button button-secondary" onClick={() => void refreshCatalog()}>
                <RefreshCw size={15} />
                {t("retry")}
              </button>
            </section>
          ) : loading ? (
            <div className="loading-panel" aria-live="polite">
              <LoaderCircle size={22} className="spin" />
              <span>{t("loading")}</span>
            </div>
          ) : (
            catalog && (
              <>
                <div className="catalog-toolbar">
                  <label className="search-box">
                    <Search size={18} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("searchPlaceholder")}
                      aria-label={t("searchLabel")}
                    />
                    {search ? (
                      <button
                        className="clear-search"
                        aria-label={t("clearSearch")}
                        onClick={() => setSearch("")}
                      >
                        <X size={15} />
                      </button>
                    ) : (
                      <kbd>
                        <Command size={12} /> K
                      </kbd>
                    )}
                  </label>
                  <span className="result-count">{t("identity", { count: filtered.length })}</span>
                </div>
                {catalog.identities.length === 0 ? (
                  <section className="empty-state">
                    <div className="empty-icon">
                      <img className="kmux-icon kmux-icon-light" src="/kmux-icon.png" alt="" />
                      <img className="kmux-icon kmux-icon-dark" src="/kmux-icon-light.png" alt="" />
                    </div>
                    <h2>{t("emptyTitle")}</h2>
                    <p>{t("emptyDescription")}</p>
                    <div className="empty-hint">
                      <span className="terminal-prompt">$</span>
                      <code>kmux key add</code>
                    </div>
                  </section>
                ) : filtered.length === 0 ? (
                  <section className="empty-state compact-empty">
                    <div className="empty-icon">
                      <Search size={23} />
                    </div>
                    <h2>{t("noResults", { query: search })}</h2>
                    <p>{t("noResultsHelp")}</p>
                  </section>
                ) : (
                  <div className="catalog-layout">
                    <section className="identity-list" aria-label={t("identityList")}>
                      {filtered.map((identity) => (
                        <button
                          key={identity.alias}
                          className={`identity-card${selected?.alias === identity.alias ? " selected-card" : ""}`}
                          aria-pressed={selected?.alias === identity.alias}
                          onClick={() => setSelectedAlias(identity.alias)}
                        >
                          <span className="identity-avatar">{initials(identity)}</span>
                          <span className="identity-summary">
                            <span className="identity-title">
                              <strong>{identity.alias}</strong>
                              <span className="agent-label">
                                <span className="agent-dot" />
                                {identity.agent}
                              </span>
                            </span>
                            <span className="identity-fingerprint">
                              <Fingerprint size={13} />
                              {identity.fingerprint}
                            </span>
                            {identity.scopes.length > 0 && (
                              <span className="scope-tags">
                                {identity.scopes.slice(0, 2).map((scope) => (
                                  <span className="scope-chip" key={scope}>
                                    {scope}
                                  </span>
                                ))}
                                {identity.scopes.length > 2 && (
                                  <span className="extra-chip">+{identity.scopes.length - 2}</span>
                                )}
                              </span>
                            )}
                          </span>
                          <ChevronRight size={17} className="card-chevron" />
                        </button>
                      ))}
                    </section>
                    {selected && (
                      <aside className="detail-panel" aria-label={t("identityDetails")}>
                        <div className="detail-topline">
                          <span>{t("detailsHeading")}</span>
                          <span className="read-only">
                            <Check size={12} />
                            {t("readOnly")}
                          </span>
                        </div>
                        <div className="detail-identity">
                          <span className="detail-avatar">
                            <KeyRound size={25} />
                          </span>
                          <div>
                            <h2>{selected.alias}</h2>
                            <span className="detail-agent">
                              <span className="agent-dot" />
                              {selected.agent}
                            </span>
                          </div>
                        </div>
                        <div className="detail-divider" />
                        <div className="detail-field">
                          <span className="field-label">{t("fingerprint")}</span>
                          <div className="fingerprint-value">
                            <Fingerprint size={15} />
                            <code>{selected.fingerprint}</code>
                          </div>
                        </div>
                        <div className="detail-field">
                          <span className="field-label">{t("agent")}</span>
                          <div className="field-value">
                            <Server size={15} />
                            {selected.agent}
                          </div>
                        </div>
                        {selected.comment && (
                          <div className="detail-field">
                            <span className="field-label">{t("comment")}</span>
                            <p className="comment-value">{selected.comment}</p>
                          </div>
                        )}
                        <div className="detail-field">
                          <span className="field-label">{t("scopesLabel")}</span>
                          {selected.scopes.length ? (
                            <div className="detail-chips">
                              {selected.scopes.map((scope) => (
                                <span className="scope-chip" key={scope}>
                                  {scope}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="field-empty">{t("noScopes")}</span>
                          )}
                        </div>
                        <div className="detail-field">
                          <span className="field-label">{t("tags")}</span>
                          {Object.keys(selected.tags).length ? (
                            <div className="detail-chips">
                              {Object.entries(selected.tags).map(([name, value]) => (
                                <span className="tag-chip" key={name}>
                                  <span>{name}</span>
                                  {value}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="field-empty">{t("noTags")}</span>
                          )}
                        </div>
                        <div className="detail-security">
                          <ShieldCheck size={16} />
                          <span>{t("security")}</span>
                        </div>
                      </aside>
                    )}
                  </div>
                )}
                <footer className="content-footer">
                  <span title={catalog.configPath}>
                    {t("source")} <code>{catalog.configPath}</code>
                  </span>
                </footer>
              </>
            )
          )}
        </section>
      </main>
      {settingsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <dialog open className="settings-modal" aria-labelledby="settings-title">
            <header>
              <h2 id="settings-title">{t("settingsTitle")}</h2>
              <button
                className="icon-button"
                aria-label={t("close")}
                onClick={() => setSettingsOpen(false)}
              >
                <X size={17} />
              </button>
            </header>
            <label className="preference-field">
              <span>{t("language")}</span>
              <select
                value={i18n.language}
                onChange={(event) => {
                  if (isAppLanguage(event.target.value)) changeLanguage(event.target.value);
                }}
              >
                {supportedLanguages.map((language) => (
                  <option key={language} value={language}>
                    {t(languageNames[language])}
                  </option>
                ))}
              </select>
            </label>
            <label className="preference-field">
              <span>{t("theme")}</span>
              <select
                value={theme}
                onChange={(event) => {
                  if (isThemePreference(event.target.value)) changeTheme(event.target.value);
                }}
              >
                <option value="system">{t("themeSystem")}</option>
                <option value="light">{t("themeLight")}</option>
                <option value="dark">{t("themeDark")}</option>
              </select>
            </label>
            <button
              className="button button-secondary modal-done"
              onClick={() => setSettingsOpen(false)}
            >
              {t("save")}
            </button>
          </dialog>
        </div>
      )}
    </div>
  );
}
