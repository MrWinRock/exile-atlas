"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- OAuth must use a full browser navigation, with no prefetch or RSC interception. */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, LockKeyhole, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { api, useStatus } from "@/lib/client";
import { useWorkspace } from "@/lib/workspace-store";
import { useTradeWorkspace } from "@/lib/trade-store";
import { Badge, Button, Loading, Notice, PageTitle, SectionHeader } from "./ui";
export function Settings() {
  const { data: status, isLoading, error } = useStatus(),
    client = useQueryClient(),
    store = useWorkspace(),
    tradeStore = useTradeWorkspace(),
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
        description="Manage your account connection and the drafts saved in this browser."
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
                    GGG account connection is not available yet. You can use the planner, build
                    library and filter editor without signing in.
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
                {status.connected && (
                  <p className="fine-print">
                    You can revoke access from your Path of Exile profile at any time.
                  </p>
                )}
              </section>
              <section className="panel">
                <SectionHeader title="Browser workspace" />
                <p className="muted">
                  {store.builds.length} saved builds, {store.filters.length} filter drafts and{" "}
                  {tradeStore.searches.length} trade searches are stored in this browser. Export
                  files to keep a portable backup.
                </p>
                {confirmClear ? (
                  <div className="button-group">
                    <Notice error>This removes all drafts from this browser.</Notice>
                    <Button
                      onClick={() => {
                        store.clearDrafts();
                        tradeStore.clearSearches();
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
            </div>
          </>
        )
      )}
      {message && <Notice>{message}</Notice>}
    </>
  );
}
