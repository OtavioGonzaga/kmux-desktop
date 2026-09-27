// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n/config";
import AgentsPage from "./AgentsPage";
import type { AgentListResponse } from "../../types/management";

const managementApi = vi.hoisted(() => ({
  getAgents: vi.fn<() => Promise<AgentListResponse>>(),
  addAgent: vi.fn(),
  updateAgentSocket: vi.fn(),
  removeAgent: vi.fn(),
  addIdentity: vi.fn(),
  importAgentIdentities: vi.fn(),
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
      identityCount: 1,
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
    managementApi.importAgentIdentities.mockResolvedValue({
      configPath: response.configPath,
      importedCount: 1,
      alreadyConfiguredCount: 0,
    });
    managementApi.updateAgentSocket.mockResolvedValue({ configPath: response.configPath });
    managementApi.removeAgent.mockResolvedValue({ configPath: response.configPath });
  });

  it("lists inspection status, socket, and advertised public fingerprints", async () => {
    render(<AgentsPage onCatalogChanged={vi.fn()} />);

    expect(await screen.findByText("work")).toBeTruthy();
    expect(screen.getByText("/run/user/1000/ssh-agent.sock")).toBeTruthy();
    expect(screen.getByText("SHA256:abc")).toBeTruthy();
  });

  it("adds an agent through the form and refreshes the catalog", async () => {
    const onCatalogChanged = vi.fn();
    render(<AgentsPage onCatalogChanged={onCatalogChanged} />);
    await screen.findByText("work");

    fireEvent.click(screen.getByRole("button", { name: "Add agent" }));
    fireEvent.change(screen.getByLabelText("Agent name"), { target: { value: "backup" } });
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

  it("registers every identity currently available from an agent", async () => {
    const onCatalogChanged = vi.fn();
    render(<AgentsPage onCatalogChanged={onCatalogChanged} />);
    await screen.findByText("work");

    fireEvent.click(screen.getByRole("button", { name: "Register all (1)" }));

    await waitFor(() => expect(managementApi.importAgentIdentities).toHaveBeenCalledWith("work"));
    expect(onCatalogChanged).toHaveBeenCalledOnce();
    expect(managementApi.getAgents).toHaveBeenCalledTimes(2);
  });
});
