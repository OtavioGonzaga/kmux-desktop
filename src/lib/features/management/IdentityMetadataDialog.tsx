import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";
import { getIdentitySnapshot, updateIdentityMetadata } from "../../api/management";
import type { IdentitySnapshotDto, ManagementError } from "../../types/management";

function errorMessage(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : String(error);
}

function managementError(error: unknown): ManagementError | null {
  if (typeof error !== "object" || error === null || !("kind" in error)) return null;
  if (typeof error.kind !== "string") return null;
  const current = "current" in error && isIdentitySnapshot(error.current) ? error.current : null;
  return { kind: error.kind, message: errorMessage(error), current };
}

function isIdentitySnapshot(value: unknown): value is IdentitySnapshotDto {
  return (
    typeof value === "object" &&
    value !== null &&
    "snapshotId" in value &&
    typeof value.snapshotId === "string" &&
    "identity" in value &&
    typeof value.identity === "object" &&
    value.identity !== null
  );
}

export default function IdentityMetadataDialog({
  alias,
  onClose,
  onSaved,
}: {
  alias: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<{
    snapshotId: string;
    alias: string;
    scopes: string;
    tags: string;
    comment: string;
  } | null>(null);
  const [conflict, setConflict] = useState<IdentitySnapshotDto | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getIdentitySnapshot(alias)
      .then((result) => {
        if (!active) return;
        setForm({
          snapshotId: result.snapshotId,
          alias: result.identity.alias,
          scopes: result.identity.scopes.join(", "),
          tags: Object.entries(result.identity.tags)
            .map(([name, value]) => `${name}=${value}`)
            .join("\n"),
          comment: result.identity.comment ?? "",
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [alias]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const tags = Object.fromEntries(
        form.tags
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const separator = line.indexOf("=");
            if (separator < 1 || separator === line.length - 1) {
              throw new Error(t("invalidTagFormat"));
            }
            return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
          }),
      );
      await updateIdentityMetadata({
        snapshotId: form.snapshotId,
        alias: form.alias,
        scopes: form.scopes
          .split(",")
          .map((scope) => scope.trim())
          .filter(Boolean),
        tags,
        comment: form.comment.trim() || null,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      const value = managementError(cause);
      if (value?.kind === "conflict" && value.current) setConflict(value.current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        className="settings-modal management-modal"
        aria-modal="true"
        aria-labelledby="edit-identity-title"
      >
        <header>
          <h2 id="edit-identity-title">{t("editIdentityTitle")}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t("close")}>
            <X size={17} />
          </button>
        </header>
        {busy && !form ? (
          <div className="loading-panel">
            <LoaderCircle size={20} className="spin" />
            {t("loading")}
          </div>
        ) : form ? (
          <form onSubmit={(event) => void save(event)}>
            <label className="preference-field">
              <span>{t("aliasLabel")}</span>
              <input value={form.alias} disabled />
            </label>
            <label className="preference-field">
              <span>{t("scopesInput")}</span>
              <input
                value={form.scopes}
                onChange={(event) => setForm({ ...form, scopes: event.target.value })}
              />
            </label>
            <label className="preference-field">
              <span>{t("tagsInput")}</span>
              <textarea
                rows={3}
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
              />
            </label>
            <label className="preference-field">
              <span>{t("comment")}</span>
              <textarea
                rows={3}
                value={form.comment}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
              />
            </label>
            {error && (
              <p className="management-error" role="alert">
                <AlertCircle size={15} />
                {error}
              </p>
            )}
            {conflict && (
              <div className="conflict-panel">
                <strong>{t("conflictCurrentTitle")}</strong>
                <span>
                  {t("conflictCurrentScopes", {
                    value: conflict.identity.scopes.join(", ") || t("noScopes"),
                  })}
                </span>
                <span>
                  {t("conflictCurrentTags", {
                    value:
                      Object.entries(conflict.identity.tags)
                        .map(([key, value]) => `${key}=${value}`)
                        .join(", ") || t("noTags"),
                  })}
                </span>
                <span>
                  {t("conflictCurrentComment", {
                    value: conflict.identity.comment || t("noComment"),
                  })}
                </span>
                <button
                  className="button button-secondary button-small"
                  type="button"
                  onClick={() => {
                    setForm({ ...form, snapshotId: conflict.snapshotId });
                    setConflict(null);
                  }}
                >
                  {t("useCurrentRevision")}
                </button>
              </div>
            )}
            <div className="form-actions">
              <button className="button button-secondary" type="button" onClick={onClose}>
                {t("cancel")}
              </button>
              <button className="button button-primary" type="submit" disabled={busy}>
                <Check size={15} />
                {busy ? t("saving") : t("save")}
              </button>
            </div>
          </form>
        ) : (
          <div className="management-error" role="alert">
            <AlertCircle size={15} />
            {error}
          </div>
        )}
      </dialog>
    </div>
  );
}
