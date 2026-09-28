// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n/config";
import AgentsPage from "./AgentsPage";
import type { AgentListResponse } from "../../types/management";

const managementApi = vi.hoisted(() => ({
  getAgents: vi.fn<() => Promise<AgentListResponse>>(),
  addAgent: vi.fn(),
  updateAgentSocket: vi.fn(),
  removeAgent: vi.fn(),
  addIdentity: vi.fn(),
  prepareAgentImport: vi.fn(),
  applyAgentImport: vi.fn(),
  removeIdentity: vi.fn(),
  getIdentitySnapshot: vi.fn(),
  updateIdentityMetadata: vi.fn(),
}));

vi.mock("../../api/management", () => managementApi);

const response: AgentListResponse = {
  configPath: "/home/test/.config/kmux/config.toml",
  agents: [
    {
      name: "work",
      socket: "/run/user/1000/ssh-agent.sock",
      status: "available",
      announcedCount: 1,
      availableCount: 1,
      identities: [{ fingerprint: "SHA256:abc", comment: "Work key" }],
      error: null,
      inspectedAtEpochMs: 1_800_000_000_000,
    },
  ],
};

describe("AgentsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    managementApi.getAgents.mockResolvedValue(response);
    managementApi.addAgent.mockResolvedValue({ configPath: response.configPath });
    managementApi.prepareAgentImport.mockResolvedValue({
      planId: "plan-1",
      configPath: response.configPath,
      additions: [{ alias: "work-key", fingerprint: "SHA256:abc", comment: "Work key" }],
      alreadyConfiguredCount: 0,
    });
    managementApi.applyAgentImport.mockResolvedValue({
      configPath: response.configPath,
      importedCount: 1,
      alreadyConfiguredCount: 0,
    });
    managementApi.updateAgentSocket.mockResolvedValue({ configPath: response.configPath });
    managementApi.removeAgent.mockResolvedValue({ configPath: response.configPath });
  });

  it("lists inspection status, socket, and advertised public fingerprints", async () => {
    render(<AgentsPage onCatalogChanged={vi.fn()} refreshKey={0} />);

    expect(await screen.findByText("work")).toBeTruthy();
    expect(screen.getByText("/run/user/1000/ssh-agent.sock")).toBeTruthy();
    expect(screen.getByText("SHA256:abc")).toBeTruthy();
  });

  it("adds an agent through the form and refreshes the catalog", async () => {
    const onCatalogChanged = vi.fn();
    render(<AgentsPage onCatalogChanged={onCatalogChanged} refreshKey={0} />);
    await screen.findByText("work");

    fireEvent.click(screen.getByRole("button", { name: "Add agent" }));
    await userEvent.type(screen.getByLabelText("Agent name"), "backup");
    expect(screen.getByRole("heading", { name: "Add SSH agent" })).toBeTruthy();
    expect(screen.getByLabelText("Agent name").hasAttribute("disabled")).toBe(false);
    fireEvent.change(screen.getByLabelText("Socket path"), {
      target: { value: "/run/user/1000/backup.sock" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() =>
      expect(managementApi.addAgent).toHaveBeenCalledWith("backup", "/run/user/1000/backup.sock"),
    );
    expect(onCatalogChanged).toHaveBeenCalledOnce();
    expect(managementApi.getAgents).toHaveBeenCalledTimes(2);
  });

  it("keeps create mode while typing a name that duplicates an existing agent", async () => {
    render(<AgentsPage onCatalogChanged={vi.fn()} refreshKey={0} />);
    await screen.findByText("work");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add agent" }));
    await user.type(screen.getByLabelText("Agent name"), "work");
    await user.type(screen.getByLabelText("Socket path"), "/run/other.sock");
    expect(screen.getByRole("heading", { name: "Add SSH agent" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() =>
      expect(managementApi.addAgent).toHaveBeenCalledWith("work", "/run/other.sock"),
    );
    expect(managementApi.updateAgentSocket).not.toHaveBeenCalled();
  });

  it("previews aliases and scopes before applying a bulk identity import", async () => {
    const onCatalogChanged = vi.fn();
    render(<AgentsPage onCatalogChanged={onCatalogChanged} refreshKey={0} />);
    await screen.findByText("work");

    fireEvent.click(screen.getByRole("button", { name: "Register all (1)" }));
    fireEvent.change(screen.getByLabelText("Scopes (comma-separated)"), {
      target: { value: "work/prod" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));

    await waitFor(() =>
      expect(managementApi.prepareAgentImport).toHaveBeenCalledWith("work", ["work/prod"]),
    );
    expect(await screen.findByText("work-key")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add identities" }));
    await waitFor(() => expect(managementApi.applyAgentImport).toHaveBeenCalledWith("plan-1"));
    expect(onCatalogChanged).toHaveBeenCalledOnce();
    expect(managementApi.getAgents).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["en-US", "Check the entered values and try again."],
    ["pt-BR", "Confira os valores informados e tente novamente."],
    ["es", "Revisa los valores y vuelve a intentarlo."],
    ["de", "Überprüfe die Eingaben und versuche es erneut."],
  ])("shows validation errors in %s", async (language, message) => {
    await i18n.changeLanguage(language);
    managementApi.getAgents.mockRejectedValue({
      kind: "validation",
      message: "localized detail must not leak",
    });
    render(<AgentsPage onCatalogChanged={vi.fn()} refreshKey={0} />);
    expect((await screen.findByRole("alert")).textContent).toContain(message);
    expect(screen.getByRole("alert").textContent).not.toContain("localized detail");
    await i18n.changeLanguage("en-US");
  });

  it("distinguishes agents with no advertised identities from fully registered agents", async () => {
    managementApi.getAgents.mockResolvedValue({
      ...response,
      agents: [
        { ...response.agents[0], announcedCount: 0, availableCount: 0, identities: [] },
        {
          ...response.agents[0],
          name: "complete",
          announcedCount: 2,
          availableCount: 0,
          identities: [],
        },
      ],
    });
    render(<AgentsPage onCatalogChanged={vi.fn()} refreshKey={0} />);

    expect(await screen.findByText("This agent did not advertise any identities.")).toBeTruthy();
    expect(
      screen.getByText("All identities advertised by this agent are already registered."),
    ).toBeTruthy();
  });

  it("re-inspects agents when the global refresh key changes", async () => {
    const view = render(<AgentsPage onCatalogChanged={vi.fn()} refreshKey={0} />);
    await screen.findByText("work");

    view.rerender(<AgentsPage onCatalogChanged={vi.fn()} refreshKey={1} />);

    await waitFor(() => expect(managementApi.getAgents).toHaveBeenCalledTimes(2));
  });
});
