"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- OAuth must use a full browser navigation, with no prefetch or RSC interception. */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Database,
  ExternalLink,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { api, useStatus } from "@/lib/client";
import { useWorkspace } from "@/lib/workspace-store";
import { Badge, Button, Loading, Notice, PageTitle, SectionHeader } from "./ui";
export function Settings() {
  const { data: status, isLoading, error } = useStatus(),
    client = useQueryClient(),
    store = useWorkspace(),
    [message, setMessage] = useState(""),
    [confirmClear, setConfirmClear] = useState(false),
    [busy, setBusy] = useState(false);
  async function disconnect() {
    setBusy(true);
    try {
      await api("auth/logout", { method: "POST" });
      client.removeQueries({ queryKey: ["characters"] });
      client.removeQueries({ queryKey: ["character"] });
      client.removeQueries({ queryKey: ["filters"] });
      await client.invalidateQueries({ queryKey: ["status"] });
      setMessage("Your GGG account has been disconnected from this workspace.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE / SETTINGS"
        title="Your workspace, your way."
        description="Manage account access, see service readiness, and keep your drafts under your control."
      />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <Notice error>{error.message}</Notice>
      ) : (
        status && (
          <>
            <div className="settings-grid">
              <section className="panel">
                <SectionHeader title="GGG account connection" aside={<ShieldCheck size={20} />} />
                <div className="connection-status">
                  <div className="empty-icon">
                    <LockKeyhole size={27} />
                  </div>
                  <div>
                    <h3>{status.profile?.name ?? "No account connected"}</h3>
                    <p>Profile, characters, and item filters</p>
                  </div>
                  <Badge tone={status.connected ? "green" : "muted"}>
                    {status.connected ? "CONNECTED" : "DISCONNECTED"}
                  </Badge>
                </div>
                {status.connected ? (
                  <Button variant="secondary" disabled={busy} onClick={() => void disconnect()}>
                    <LogOut size={15} />
                    Disconnect account
                  </Button>
                ) : status.oauthConfigured ? (
                  <a href="/api/auth/start" className="button primary">
                    Connect with Path of Exile <ArrowUpRight size={16} />
                  </a>
                ) : (
                  <Notice>
                    Local editors and public tools are available now. Complete the application
                    configuration below to enable account access.
                  </Notice>
                )}
                <div className="scope-list">
                  <span>
                    <ShieldCheck size={14} />
                    Basic profile
                  </span>
                  <span>
                    <ShieldCheck size={14} />
                    PoE2 characters
                  </span>
                  <span>
                    <ShieldCheck size={14} />
                    Online loot filters
                  </span>
                </div>
                <p className="fine-print">
                  GGG currently cannot process new application registrations. This connection
                  requires an existing approved client. You can revoke access from your Path of
                  Exile profile at any time.
                </p>
                <a
                  href="https://www.pathofexile.com/developer/docs/authorization"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  How account authorization works <ExternalLink size={13} />
                </a>
              </section>
              <section className="panel">
                <SectionHeader title="Service readiness" aside={<Terminal size={19} />} />
                {[
                  ["Runtime", status.runtime, true],
                  [
                    "GGG OAuth",
                    status.oauthConfigured ? "Configured" : "Setup required",
                    status.oauthConfigured,
                  ],
                  [
                    "PostgreSQL",
                    status.databaseConfigured ? "Configured" : "Optional for local tools",
                    status.databaseConfigured,
                  ],
                  [
                    "Redis & worker",
                    status.redisConfigured ? "Configured" : "Optional for local tools",
                    status.redisConfigured,
                  ],
                ].map(([name, value, ready]) => (
                  <div className="service-row" key={String(name)}>
                    <span className={ready ? "status-light" : "inactive-light"} />
                    <strong>{name}</strong>
                    <span>{value}</span>
                  </div>
                ))}
                <p className="fine-print">
                  Readiness shows configuration presence. A running database and worker are required
                  to collect historical trends.
                </p>
              </section>
            </div>
            <section className="panel configuration-panel">
              <SectionHeader title="Application configuration" aside={<Badge>SERVER ONLY</Badge>} />
              <p className="muted">
                Copy <code>.env.example</code> to <code>.env.local</code>, fill the required values,
                then restart the app. Credentials stay on the server.
              </p>
              {status.setupIssues.length > 0 && (
                <ul className="setup-list">
                  {status.setupIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              <pre className="data-pre">{`APP_URL=https://your-domain.example\nPOE_CLIENT_ID=your-registered-client\nPOE_CLIENT_SECRET=your-client-secret\nPOE_CONTACT=you@example.com\nPOE_REDIRECT_URI=https://your-domain.example/api/auth/callback\nTOKEN_ENCRYPTION_KEY=<64 hexadecimal characters>\nDATABASE_URL=postgres://…\nREDIS_URL=redis://…`}</pre>
              <div className="configuration-note">
                <Database size={18} />
                <p>
                  Run <code>bun run db:setup</code> to create the schema. Run{" "}
                  <code>bun run worker</code> to collect currency history. League and ladder access
                  additionally need <code>service:leagues</code> and{" "}
                  <code>service:leagues:ladder</code> scopes.
                </p>
              </div>
            </section>
            <section className="panel">
              <SectionHeader title="Browser workspace" />
              <p className="muted">
                {store.builds.length} saved builds and {store.filters.length} filter drafts are
                stored in this browser. Export files to keep a portable backup.
              </p>
              {confirmClear ? (
                <div className="button-group">
                  <Notice error>This removes all drafts from this browser.</Notice>
                  <Button
                    onClick={() => {
                      store.clearDrafts();
                      setConfirmClear(false);
                      setMessage("Browser drafts cleared.");
                    }}
                  >
                    Clear all drafts
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmClear(false)}>
                    Keep drafts
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setConfirmClear(true)}>
                  <Trash2 size={15} />
                  Clear browser drafts
                </Button>
              )}
            </section>
          </>
        )
      )}
      {message && <Notice>{message}</Notice>}
    </>
  );
}
