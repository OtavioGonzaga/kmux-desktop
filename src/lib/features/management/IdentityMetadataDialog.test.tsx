// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../i18n/config";
import IdentityMetadataDialog from "./IdentityMetadataDialog";

const api = vi.hoisted(() => ({
  getIdentitySnapshot: vi.fn(),
  updateIdentityMetadata: vi.fn(),
}));

vi.mock("../../api/management", () => api);

const snapshot = (snapshotId: string, scopes: string[]) => ({
  snapshotId,
  identity: {
    alias: "work-key",
    fingerprint: "SHA256:abc",
    agent: "work",
    scopes,
    tags: {},
    comment: null,
  },
});

describe("IdentityMetadataDialog", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.getIdentitySnapshot.mockResolvedValue(snapshot("revision-1", ["old"]));
  });

  it("preserves edited values and retries against the refreshed revision after a conflict", async () => {
    api.updateIdentityMetadata
      .mockRejectedValueOnce({
        kind: "conflict",
        message: "localized internal detail",
        current: snapshot("revision-2", ["remote"]),
      })
      .mockResolvedValueOnce({ configPath: "/config.toml" });
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<IdentityMetadataDialog alias="work-key" onClose={onClose} onSaved={onSaved} />);

    const scopes = await screen.findByLabelText("Scopes (comma-separated)");
    fireEvent.change(scopes, { target: { value: "my/edited/scope" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(await screen.findByText("Current configuration version")).toBeTruthy();
    expect(screen.getByText("Scopes: remote")).toBeTruthy();
    expect(screen.getByLabelText("Scopes (comma-separated)")).toHaveProperty(
      "value",
      "my/edited/scope",
    );
    expect(screen.getByRole("alert").textContent).not.toContain("localized internal detail");

    fireEvent.click(
      screen.getByRole("button", { name: "Keep my edits and retry against the current version" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(api.updateIdentityMetadata).toHaveBeenCalledTimes(2));
    expect(api.updateIdentityMetadata.mock.calls[1][0]).toMatchObject({
      snapshotId: "revision-2",
      scopes: ["my/edited/scope"],
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
