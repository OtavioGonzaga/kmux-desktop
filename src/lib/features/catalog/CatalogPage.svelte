<script lang="ts">
  import {
    AlertCircle,
    Check,
    ChevronRight,
    CircleHelp,
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
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { getCatalog } from "$lib/api/catalog";
  import { filterIdentities } from "$lib/features/catalog/filter";
  import type { CatalogError, CatalogResponse, IdentityDto } from "$lib/types/catalog";

  let catalog = $state<CatalogResponse | null>(null);
  let error = $state<CatalogError | null>(null);
  let loading = $state(true);
  let search = $state("");
  let selectedAlias = $state<string | null>(null);

  const filtered = $derived(filterIdentities(catalog?.identities ?? [], search));
  const selected = $derived(
    filtered.find((identity) => identity.alias === selectedAlias) ?? filtered[0] ?? null,
  );

  onMount(() => {
    void refreshCatalog();
  });

  async function refreshCatalog() {
    loading = true;
    error = null;
    try {
      catalog = await getCatalog();
      if (!selectedAlias && catalog.identities.length > 0) {
        selectedAlias = catalog.identities[0].alias;
      }
    } catch (cause) {
      catalog = null;
      error = normalizeError(cause);
    } finally {
      loading = false;
    }
  }

  function normalizeError(cause: unknown): CatalogError {
    if (typeof cause === "object" && cause !== null && "message" in cause) {
      return {
        kind: "catalog-error",
        message: String((cause as { message: unknown }).message),
      };
    }
    return { kind: "catalog-error", message: String(cause) };
  }

  function initials(identity: IdentityDto): string {
    return identity.alias.slice(0, 1).toUpperCase();
  }
</script>

<svelte:head>
  <title>Identidades — kmux Desktop</title>
  <meta name="description" content="Gerencie e consulte seu catálogo de identidades SSH do kmux." />
</svelte:head>

<div class="app-shell">
  <aside class="sidebar" aria-label="Navegação principal">
    <a class="brand" href="#catalog" aria-label="kmux Desktop, início">
      <span class="brand-mark"><KeyRound size={22} strokeWidth={2.4} /></span>
      <span class="brand-copy"><strong>kmux</strong><small>IDENTITY MANAGER</small></span>
    </a>

    <div class="workspace-label">WORKSPACE</div>
    <nav class="nav-list">
      <a class="nav-item active" href="#catalog" aria-current="page">
        <KeyRound size={18} /><span>Identidades</span>
        {#if catalog}<span class="nav-count">{catalog.identities.length}</span>{/if}
      </a>
      <button class="nav-item" disabled title="Disponível em uma etapa futura">
        <Layers3 size={18} /><span>Scopes</span><span class="soon">EM BREVE</span>
      </button>
      <button class="nav-item" disabled title="Disponível em uma etapa futura">
        <Server size={18} /><span>Agents</span><span class="soon">EM BREVE</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <div class="sidebar-rule"></div>
      <button class="nav-item" disabled title="Preferências estarão disponíveis em uma etapa futura">
        <Settings2 size={18} /><span>Configurações</span>
      </button>
      <div class="sidebar-note"><ShieldCheck size={15} /> Chaves privadas ficam no seu agent.</div>
      <div class="sidebar-version"><span class="status-dot"></span> Catálogo local</div>
    </div>
  </aside>

  <main class="main-area" id="catalog">
    <header class="topbar">
      <div class="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>Identidades</strong></div>
      <div class="top-actions">
        <div class="config-indicator" title={catalog?.configPath ?? "Configuração não carregada"}>
          <span class="status-dot"></span>
          <span>kmux config</span>
        </div>
        <button class="icon-button" aria-label="Atualizar catálogo" onclick={refreshCatalog} disabled={loading}>
          <RefreshCw size={17} class={loading ? "spin" : ""} />
        </button>
        <button class="avatar" aria-label="kmux Desktop">K</button>
      </div>
    </header>

    <section class="content-wrap">
      <div class="page-heading">
        <div>
          <div class="eyebrow">SEU ACESSO, EM UM SÓ LUGAR</div>
          <h1>Identidades</h1>
          <p class="heading-description">Consulte as identidades públicas registradas no seu catálogo kmux.</p>
        </div>
        <div class="heading-meta">
          {#if catalog}
            <span class="agent-pill"><span class="status-dot"></span>{catalog.agentCount} {catalog.agentCount === 1 ? "agent cadastrado" : "agents cadastrados"}</span>
          {/if}
        </div>
      </div>

      {#if error}
        <section class="error-panel" role="alert">
          <div class="error-icon"><AlertCircle size={21} /></div>
          <div class="error-copy">
            <h2>{error.kind === "config-not-found" ? "Configuração não encontrada" : "Não foi possível carregar o catálogo"}</h2>
            <p>{error.message}</p>
            {#if error.kind === "config-not-found"}
              <p class="error-help">Crie uma configuração com a CLI `kmux` ou defina a variável `KMUX_CONFIG` e tente novamente.</p>
            {/if}
          </div>
          <button class="button button-secondary" onclick={refreshCatalog}><RefreshCw size={15} /> Tentar novamente</button>
        </section>
      {:else if loading}
        <div class="loading-panel" aria-live="polite"><LoaderCircle size={22} class="spin" /><span>Lendo catálogo do kmux…</span></div>
      {:else if catalog}
        <div class="catalog-toolbar">
          <label class="search-box">
            <Search size={18} />
            <input bind:value={search} placeholder="Buscar por alias, scope, agent ou fingerprint…" aria-label="Buscar identidades" />
            {#if search}
              <button class="clear-search" aria-label="Limpar busca" onclick={() => (search = "")}><X size={15} /></button>
            {:else}
              <kbd><Command size={12} /> K</kbd>
            {/if}
          </label>
          <span class="result-count">{filtered.length} {filtered.length === 1 ? "identidade" : "identidades"}</span>
        </div>

        {#if catalog.identities.length === 0}
          <section class="empty-state">
            <div class="empty-icon"><KeyRound size={25} /></div>
            <h2>Seu catálogo está pronto para começar</h2>
            <p>Quando identidades públicas estiverem registradas no kmux, elas aparecerão aqui.</p>
            <div class="empty-hint"><span class="terminal-prompt">$</span><code>kmux key add</code></div>
          </section>
        {:else if filtered.length === 0}
          <section class="empty-state compact-empty">
            <div class="empty-icon"><Search size={23} /></div>
            <h2>Nenhum resultado para “{search}”</h2>
            <p>Tente buscar por outro alias, scope, agent ou fingerprint.</p>
          </section>
        {:else}
          <div class="catalog-layout">
            <section class="identity-list" aria-label="Lista de identidades">
              {#each filtered as identity (identity.alias)}
                <button
                  class="identity-card"
                  class:selected-card={selected?.alias === identity.alias}
                  aria-pressed={selected?.alias === identity.alias}
                  onclick={() => (selectedAlias = identity.alias)}
                >
                  <span class="identity-avatar">{initials(identity)}</span>
                  <span class="identity-summary">
                    <span class="identity-title"><strong>{identity.alias}</strong><span class="agent-label"><span class="agent-dot"></span>{identity.agent}</span></span>
                    <span class="identity-fingerprint"><Fingerprint size={13} />{identity.fingerprint}</span>
                    {#if identity.scopes.length > 0}
                      <span class="scope-tags">{#each identity.scopes.slice(0, 2) as scope}<span class="scope-chip">{scope}</span>{/each}{#if identity.scopes.length > 2}<span class="extra-chip">+{identity.scopes.length - 2}</span>{/if}</span>
                    {/if}
                  </span>
                  <ChevronRight size={17} class="card-chevron" />
                </button>
              {/each}
            </section>

            {#if selected}
              <aside class="detail-panel" aria-label="Detalhes da identidade">
                <div class="detail-topline"><span>DETALHES DA IDENTIDADE</span><span class="read-only"><Check size={12} /> SOMENTE LEITURA</span></div>
                <div class="detail-identity">
                  <span class="detail-avatar"><KeyRound size={25} /></span>
                  <div><h2>{selected.alias}</h2><span class="detail-agent"><span class="agent-dot"></span>{selected.agent}</span></div>
                </div>
                <div class="detail-divider"></div>
                <div class="detail-field">
                  <span class="field-label">FINGERPRINT</span>
                  <div class="fingerprint-value"><Fingerprint size={15} /><code>{selected.fingerprint}</code></div>
                </div>
                <div class="detail-field">
                  <span class="field-label">AGENT</span>
                  <div class="field-value"><Server size={15} />{selected.agent}</div>
                </div>
                {#if selected.comment}
                  <div class="detail-field"><span class="field-label">COMENTÁRIO</span><p class="comment-value">{selected.comment}</p></div>
                {/if}
                <div class="detail-field">
                  <span class="field-label">SCOPES</span>
                  {#if selected.scopes.length > 0}
                    <div class="detail-chips">{#each selected.scopes as scope}<span class="scope-chip">{scope}</span>{/each}</div>
                  {:else}<span class="field-empty">Nenhum scope associado</span>{/if}
                </div>
                <div class="detail-field">
                  <span class="field-label">TAGS</span>
                  {#if Object.keys(selected.tags).length > 0}
                    <div class="detail-chips">{#each Object.entries(selected.tags) as [name, value]}<span class="tag-chip"><span>{name}</span>{value}</span>{/each}</div>
                  {:else}<span class="field-empty">Nenhuma tag</span>{/if}
                </div>
                <div class="detail-security"><ShieldCheck size={16} /><span>Somente metadados públicos são exibidos. Nenhuma chave privada é lida ou armazenada.</span></div>
              </aside>
            {/if}
          </div>
        {/if}
        <footer class="content-footer"><span title={catalog.configPath}>Fonte: <code>{catalog.configPath}</code></span><span>Dados ilustrativos não são usados; exibindo configuração local.</span></footer>
      {/if}
    </section>
  </main>

  <button class="help-button" aria-label="Ajuda" title="Ajuda"><CircleHelp size={18} /></button>
</div>

<style>
  .app-shell { min-height: 100vh; display: grid; grid-template-columns: 248px minmax(0, 1fr); background: var(--color-bg); }
  .sidebar { position: sticky; top: 0; display: flex; flex-direction: column; height: 100vh; padding: 27px 16px 18px; border-right: 1px solid var(--color-border); background: #191c23; }
  .brand { display: flex; align-items: center; gap: 12px; margin: 0 9px 50px; color: var(--color-text); text-decoration: none; }
  .brand-mark { display: grid; width: 40px; height: 40px; place-items: center; color: #111722; background: var(--color-accent); border-radius: 12px; }
  .brand-copy { display: flex; flex-direction: column; gap: 1px; }
  .brand-copy strong { font-size: 22px; letter-spacing: -.7px; line-height: 1.1; }
  .brand-copy small { color: #7e8796; font-size: 9px; font-weight: 750; letter-spacing: 1.15px; }
  .workspace-label { margin: 0 11px 10px; color: #777f8d; font-size: 10px; font-weight: 750; letter-spacing: 1.25px; }
  .nav-list { display: grid; gap: 5px; }
  .nav-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 43px; padding: 0 12px; border: 0; border-radius: 8px; color: #a6adba; background: transparent; text-align: left; text-decoration: none; font-size: 13px; font-weight: 550; }
  button.nav-item { cursor: not-allowed; opacity: .58; }
  .nav-item.active { color: #f4f6fa; background: #292e38; box-shadow: inset 2px 0 #82aaff; }
  :global(.nav-item.active > svg) { color: var(--color-accent); }
  .nav-count { margin-left: auto; min-width: 22px; padding: 2px 6px; border-radius: 12px; color: #d3d9e3; background: #3a414e; font-size: 10px; text-align: center; }
  .soon { margin-left: auto; color: #7e8796; font-size: 8px; font-weight: 700; letter-spacing: .5px; }
  .sidebar-bottom { margin-top: auto; }
  .sidebar-rule { height: 1px; margin: 0 7px 13px; background: var(--color-border); }
  .sidebar-note { display: flex; align-items: flex-start; gap: 8px; margin: 21px 9px 18px; color: #8f98a7; font-size: 11px; line-height: 1.5; }
  .sidebar-note :global(svg) { flex: 0 0 auto; margin-top: 1px; color: #75c995; }
  .sidebar-version { display: flex; align-items: center; gap: 8px; padding: 12px 9px 0; border-top: 1px solid #2a2f39; color: #747d8b; font-size: 10px; }
  .status-dot, .agent-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--color-success); box-shadow: 0 0 0 3px #68d3911a; }
  .main-area { min-width: 0; }
  .topbar { position: sticky; z-index: 2; top: 0; display: flex; height: 66px; align-items: center; justify-content: space-between; padding: 0 44px; border-bottom: 1px solid #282d36; background: #171a20ed; backdrop-filter: blur(12px); }
  .breadcrumb, .top-actions { display: flex; align-items: center; }
  .breadcrumb { gap: 9px; color: #858d9a; font-size: 12px; }
  .breadcrumb strong { color: #dce0e7; font-weight: 600; }
  .top-actions { gap: 15px; }
  .config-indicator { display: flex; align-items: center; gap: 8px; color: #a7afbc; font-size: 11px; }
  .config-indicator .status-dot { width: 6px; height: 6px; }
  .icon-button, .avatar { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #343a46; border-radius: 8px; color: #aeb6c3; background: #20242c; }
  .icon-button { cursor: pointer; }
  .icon-button:disabled { cursor: wait; }
  .avatar { width: 30px; height: 30px; border: 0; border-radius: 50%; color: #152033; background: #9bb8f1; font-size: 12px; font-weight: 750; }
  .content-wrap { max-width: 1430px; margin: 0 auto; padding: 42px 44px 24px; }
  .page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 27px; }
  .eyebrow { margin-bottom: 8px; color: #818a99; font-size: 10px; font-weight: 750; letter-spacing: 1.25px; }
  h1 { margin: 0; color: #f5f6f9; font-size: 30px; font-weight: 680; letter-spacing: -.8px; }
  .heading-description { margin: 8px 0 0; color: #9ba3b1; font-size: 13px; }
  .heading-meta { display: flex; align-items: center; padding-bottom: 3px; }
  .agent-pill { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border: 1px solid #2f3c39; border-radius: 20px; color: #a9cbb6; background: #202a29; font-size: 10px; }
  .agent-pill .status-dot { width: 6px; height: 6px; }
  .catalog-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
  .search-box { display: flex; width: min(610px, 100%); height: 42px; align-items: center; gap: 11px; padding: 0 12px; border: 1px solid #353b47; border-radius: 8px; color: #8e97a5; background: #1d2129; }
  .search-box:focus-within { border-color: #6e91cf; box-shadow: 0 0 0 3px #82aaff18; }
  .search-box input { width: 100%; min-width: 0; border: 0; outline: 0; color: #e6e9ef; background: transparent; font-size: 12px; }
  .search-box input::placeholder { color: #77808f; }
  kbd { display: flex; align-items: center; gap: 3px; padding: 3px 5px; border: 1px solid #3a404b; border-radius: 4px; color: #8d96a4; font-size: 10px; white-space: nowrap; }
  .clear-search { display: grid; place-items: center; padding: 3px; border: 0; color: #929aa8; background: transparent; cursor: pointer; }
  .result-count { color: #8f98a6; font-size: 11px; white-space: nowrap; }
  .catalog-layout { display: grid; grid-template-columns: minmax(300px, .95fr) minmax(340px, 1.05fr); gap: 17px; align-items: start; }
  .identity-list { display: grid; gap: 9px; }
  .identity-card { display: flex; min-width: 0; align-items: center; gap: 13px; padding: 15px 13px; border: 1px solid #2d333e; border-radius: 10px; color: inherit; background: #1e222a; text-align: left; cursor: pointer; transition: border-color .15s, background .15s, transform .15s; }
  .identity-card:hover { border-color: #4b5669; background: #232832; transform: translateY(-1px); }
  .identity-card.selected-card { border-color: #5974a5; background: linear-gradient(110deg, #273143, #202630 78%); box-shadow: inset 2px 0 var(--color-accent); }
  .identity-avatar { display: grid; width: 39px; height: 39px; flex: 0 0 auto; place-items: center; border: 1px solid #39475e; border-radius: 11px; color: #a8c2f5; background: #2a3548; font-size: 15px; font-weight: 700; }
  .identity-summary { display: grid; min-width: 0; gap: 6px; }
  .identity-title { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .identity-title strong { overflow: hidden; color: #eff1f5; font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  .agent-label, .detail-agent { display: inline-flex; align-items: center; gap: 6px; color: #929ba9; font-size: 10px; white-space: nowrap; }
  .agent-label .agent-dot, .detail-agent .agent-dot { width: 5px; height: 5px; background: #9ba8bb; box-shadow: none; }
  .identity-fingerprint { display: flex; align-items: center; gap: 5px; overflow: hidden; color: #818a98; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .identity-fingerprint :global(svg) { flex: 0 0 auto; }
  .scope-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .scope-chip, .extra-chip { max-width: 100%; overflow: hidden; padding: 3px 7px; border: 1px solid #353e4a; border-radius: 5px; color: #b4c2d8; background: #282f3a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
  .extra-chip { color: #b8b0e7; background: #302b43; }
  :global(.card-chevron) { flex: 0 0 auto; margin-left: auto; color: #657080; }
  .detail-panel { overflow: hidden; border: 1px solid #303642; border-radius: 10px; background: #1e222a; }
  .detail-topline { display: flex; min-height: 45px; align-items: center; justify-content: space-between; gap: 8px; padding: 0 16px; border-bottom: 1px solid #303642; color: #8f98a6; font-size: 9px; font-weight: 750; letter-spacing: .8px; }
  .read-only { display: flex; align-items: center; gap: 5px; color: #78c79a; font-size: 8px; letter-spacing: .5px; white-space: nowrap; }
  .detail-identity { display: flex; align-items: center; gap: 13px; padding: 19px 17px; }
  .detail-avatar { display: grid; width: 48px; height: 48px; place-items: center; border: 1px solid #465a7c; border-radius: 14px; color: #a8c2f5; background: #2a3548; }
  .detail-identity h2 { margin: 0 0 6px; color: #f0f2f6; font-size: 16px; font-weight: 650; }
  .detail-divider { height: 1px; background: #303642; }
  .detail-field { display: grid; gap: 9px; padding: 14px 17px; border-bottom: 1px solid #2c313a; }
  .field-label { color: #7f8998; font-size: 9px; font-weight: 750; letter-spacing: .8px; }
  .fingerprint-value, .field-value { display: flex; align-items: center; gap: 8px; min-width: 0; color: #dce1e9; font-size: 11px; }
  .fingerprint-value :global(svg), .field-value :global(svg) { flex: 0 0 auto; color: #91a4c4; }
  .fingerprint-value code { overflow-wrap: anywhere; color: #c8d2e2; font-size: 10px; }
  .comment-value { margin: 0; color: #ccd2dc; font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
  .detail-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag-chip { display: inline-flex; gap: 7px; padding: 4px 7px; border: 1px solid #394152; border-radius: 5px; color: #d6dceb; background: #272d38; font-size: 10px; }
  .tag-chip span { color: #8e9aae; }
  .field-empty { color: #737d8c; font-size: 10px; }
  .detail-security { display: flex; align-items: flex-start; gap: 9px; margin: 13px; padding: 11px; border: 1px solid #2f4039; border-radius: 7px; color: #9db5a8; background: #222b29; font-size: 10px; line-height: 1.5; }
  .detail-security :global(svg) { flex: 0 0 auto; color: #78c79a; }
  .content-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; color: #727b89; font-size: 9px; }
  .content-footer span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .content-footer code { color: #8993a2; font-size: 9px; }
  .loading-panel { display: flex; min-height: 300px; align-items: center; justify-content: center; gap: 11px; color: #aab2bf; font-size: 12px; }
  .loading-panel :global(svg) { color: var(--color-accent); }
  .error-panel { display: flex; align-items: flex-start; gap: 14px; padding: 20px; border: 1px solid #573d3d; border-radius: 10px; background: #2a2225; }
  .error-icon { display: grid; width: 37px; height: 37px; flex: 0 0 auto; place-items: center; border-radius: 10px; color: #ff9d87; background: #4a2d2e; }
  .error-copy { flex: 1; }
  .error-copy h2, .empty-state h2 { margin: 0; color: #f1f2f5; font-size: 15px; font-weight: 650; }
  .error-copy p, .empty-state p { margin: 7px 0 0; color: #a3aab6; font-size: 12px; line-height: 1.55; }
  .error-copy .error-help { color: #c9a69d; }
  .button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 34px; padding: 0 12px; border-radius: 7px; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer; }
  .button-secondary { border: 1px solid #49414a; color: #e1dce1; background: #342a30; }
  .empty-state { display: flex; min-height: 310px; flex-direction: column; align-items: center; justify-content: center; padding: 35px; border: 1px dashed #3b424e; border-radius: 10px; background: #1c2027; text-align: center; }
  .compact-empty { min-height: 235px; }
  .empty-icon { display: grid; width: 52px; height: 52px; margin-bottom: 17px; place-items: center; border: 1px solid #39465c; border-radius: 15px; color: #a8c2f5; background: #293448; }
  .empty-hint { display: flex; gap: 9px; margin-top: 19px; padding: 9px 12px; border: 1px solid #343b46; border-radius: 7px; color: #abb4c2; background: #20252d; font-size: 11px; }
  .terminal-prompt { color: var(--color-success); }
  .help-button { position: fixed; right: 22px; bottom: 20px; display: grid; width: 35px; height: 35px; place-items: center; border: 1px solid #343a46; border-radius: 50%; color: #939dab; background: #20242c; }
  :global(.spin) { animation: spin 1.2s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 1050px) {
    .app-shell { grid-template-columns: 210px minmax(0, 1fr); }
    .content-wrap { padding-right: 28px; padding-left: 28px; }
    .topbar { padding: 0 28px; }
    .catalog-layout { grid-template-columns: minmax(250px, .9fr) minmax(290px, 1.1fr); gap: 12px; }
  }
  @media (max-width: 800px) {
    .app-shell { grid-template-columns: 66px minmax(0, 1fr); }
    .sidebar { align-items: center; padding: 18px 7px; }
    .brand { margin: 0 0 42px; }
    .brand-copy, .workspace-label, .nav-item span, .sidebar-bottom .nav-item span, .sidebar-note, .sidebar-version { display: none; }
    .nav-list { width: 100%; }
    .nav-item { justify-content: center; padding: 0; }
    .nav-count { display: none; }
    .sidebar-bottom { width: 100%; }
    .sidebar-rule { margin: 0 0 12px; }
    .topbar { padding: 0 18px; }
    .content-wrap { padding: 30px 18px 20px; }
    .catalog-layout { grid-template-columns: 1fr; }
    .detail-panel { grid-row: 1; }
  }
  @media (max-width: 560px) {
    .app-shell { grid-template-columns: 1fr; }
    .sidebar { position: sticky; z-index: 3; top: 0; height: auto; flex-direction: row; justify-content: space-between; padding: 10px 14px; border-right: 0; border-bottom: 1px solid var(--color-border); }
    .brand { margin: 0; }
    .brand-mark { width: 34px; height: 34px; }
    .brand-copy { display: flex; }
    .brand-copy strong { font-size: 18px; }
    .brand-copy small { font-size: 8px; }
    .workspace-label, .sidebar-bottom, .nav-item span, .nav-count { display: none !important; }
    .nav-list { display: flex; width: auto; margin-left: auto; }
    .nav-item { width: 38px; min-height: 36px; }
    .nav-item.active { box-shadow: inset 0 -2px var(--color-accent); }
    .topbar { display: none; }
    .content-wrap { padding: 27px 14px 20px; }
    .page-heading { align-items: flex-start; flex-direction: column; margin-bottom: 19px; }
    h1 { font-size: 26px; }
    .heading-description { max-width: 330px; line-height: 1.5; }
    .catalog-toolbar { align-items: flex-start; flex-direction: column; gap: 9px; }
    .search-box { width: 100%; }
    .identity-card { gap: 10px; padding: 12px 10px; }
    .identity-title { align-items: flex-start; flex-direction: column; gap: 4px; }
    .content-footer { flex-direction: column; }
    .error-panel { flex-wrap: wrap; padding: 15px; }
    .error-copy { min-width: calc(100% - 55px); }
    .button-secondary { margin-left: 51px; }
    .help-button { display: none; }
  }
</style>
