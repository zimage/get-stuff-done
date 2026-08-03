"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "../../lib/trpc";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const tokensQuery = trpc.apiTokens.list.useQuery({});
  const createMutation = trpc.apiTokens.create.useMutation({
    onSuccess: () => utils.apiTokens.list.invalidate(),
  });
  const revokeMutation = trpc.apiTokens.revoke.useMutation({
    onSuccess: () => utils.apiTokens.list.invalidate(),
  });

  const [name, setName] = useState("");
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: (data) => {
          setJustCreatedToken(data.token);
          setCopied(false);
          setName("");
        },
      },
    );
  }

  async function handleCopy() {
    if (!justCreatedToken) return;
    try {
      await navigator.clipboard.writeText(justCreatedToken);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="inbox">
      <header>
        <h1>Settings</h1>
      </header>

      <section className="settings-section">
        <h2>API access</h2>
        <p className="form-hint">
          Personal access tokens let you (or a script) call the API directly with{" "}
          <code>Authorization: Bearer &lt;token&gt;</code> — no browser login involved. See{" "}
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
            API documentation
          </a>{" "}
          for the full reference.
        </p>

        {justCreatedToken && (
          <div className="token-reveal">
            <p className="form-hint">
              Copy this token now — it won't be shown again.
            </p>
            <div className="token-reveal-row">
              <code>{justCreatedToken}</code>
              <button type="button" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button type="button" onClick={() => setJustCreatedToken(null)}>
              Done
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="new-project-form">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Token name (e.g. 'My laptop')…"
          />
          <button type="submit" disabled={createMutation.isPending}>
            Create token
          </button>
        </form>
        {createMutation.error && <p className="form-error">{createMutation.error.message}</p>}

        {tokensQuery.isLoading && <p>Loading…</p>}
        {tokensQuery.data?.length === 0 && <p className="empty-hint">No API tokens yet.</p>}

        <ul className="token-list">
          {tokensQuery.data?.map((tokenRecord) => (
            <li key={tokenRecord.id} className="token-row">
              <div>
                <div className="token-row-name">
                  {tokenRecord.name}{" "}
                  <span className="form-hint">…{tokenRecord.tokenPreview}</span>
                </div>
                <div className="form-hint">
                  Created {tokenRecord.createdAt.toLocaleString()}
                  {tokenRecord.lastUsedAt && ` · Last used ${tokenRecord.lastUsedAt.toLocaleString()}`}
                  {tokenRecord.revokedAt && ` · Revoked ${tokenRecord.revokedAt.toLocaleString()}`}
                </div>
              </div>
              {!tokenRecord.revokedAt && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Revoke "${tokenRecord.name}"? Anything using it will stop working immediately.`)) {
                      revokeMutation.mutate({ id: tokenRecord.id });
                    }
                  }}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
