"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  RefreshCw,
  Search,
  Trophy,
} from "lucide-react";
import { api, useStatus } from "@/lib/client";
import type { League, LadderEntry } from "@/lib/poe";
import { Badge, Button, Empty, Loading, Notice, PageTitle, SectionHeader } from "./ui";
export function Leagues() {
  const { data: status } = useStatus(),
    [selected, setSelected] = useState(""),
    [offset, setOffset] = useState(0),
    [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["leagues"],
    queryFn: () => api<{ leagues: League[] }>("leagues"),
    enabled: !!status?.oauthConfigured,
  });
  const ladder = useQuery({
    queryKey: ["ladder", selected, offset],
    queryFn: () =>
      api<{
        league: League;
        ladder: { entries: LadderEntry[]; total: number; cached_since?: string };
      }>(`ladder?league=${encodeURIComponent(selected)}&offset=${offset}`),
    enabled: !!selected,
  });
  const rows = (ladder.data?.ladder.entries ?? []).filter((e) =>
    `${e.character.name} ${e.character.class} ${e.account?.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="WRAECLAST / LEAGUES & LADDERS"
        title="Follow the climb."
        description="Find your league and follow the top 1,000 PoE2 characters."
        action={
          <Button
            variant="secondary"
            disabled={!status?.oauthConfigured || query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={15} />
            Refresh leagues
          </Button>
        }
      />
      {!status?.oauthConfigured ? (
        <Empty
          icon={ChartNoAxesCombined}
          title="Connect your application's league access."
          description="GGG’s league and ladder endpoints require service scopes on an approved confidential OAuth client."
        >
          <Link href="/settings" className="button primary">
            Open connection settings <ArrowRight size={15} />
          </Link>
        </Empty>
      ) : (
        <>
          {query.isLoading && <Loading label="Loading leagues" />}
          {query.error && <Notice error>{query.error.message}</Notice>}
          <div className="league-grid">
            {query.data?.leagues.map((l) => (
              <button
                className={`panel league-card ${selected === l.id ? "selected" : ""}`}
                key={l.id}
                onClick={() => {
                  setSelected(l.id);
                  setOffset(0);
                }}
              >
                <Trophy size={21} />
                <h2>{l.name ?? l.id}</h2>
                <p>{l.description || "Explore this league’s rankings."}</p>
                <div>
                  {l.rules?.map((r) => (
                    <Badge key={r.id}>{r.name}</Badge>
                  ))}
                </div>
                <span className="text-link">
                  View ladder <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <section className="panel ladder-panel">
              <SectionHeader
                title={selected + " ladder"}
                aside={<Badge tone="amber">TOP 1,000</Badge>}
              />
              <div className="table-toolbar">
                <label className="search-field">
                  <Search size={16} />
                  <input
                    placeholder="Search this page…"
                    aria-label="Search ladder"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <span className="muted text-small">
                  Ranks {offset + 1}–{offset + 500}
                </span>
              </div>
              {ladder.isLoading ? (
                <Loading label="Loading ladder" />
              ) : ladder.error ? (
                <Notice error>{ladder.error.message}</Notice>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Character</th>
                        <th>Class</th>
                        <th>Level</th>
                        <th>Experience</th>
                        <th>Account</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((e) => (
                        <tr key={e.character.id}>
                          <td className="numeric accent">#{e.rank}</td>
                          <td>
                            <strong>{e.character.name}</strong>
                          </td>
                          <td>{e.character.class}</td>
                          <td className="numeric">{e.character.level}</td>
                          <td className="numeric">
                            {e.character.experience?.toLocaleString() ?? "—"}
                          </td>
                          <td>{e.account?.name ?? "Private"}</td>
                          <td>
                            <Badge tone={e.dead ? "muted" : "green"}>
                              {e.dead ? "DEAD" : "ACTIVE"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length === 0 && (
                    <p className="small-empty">No entries on this page match your search.</p>
                  )}
                </div>
              )}
              <div className="pagination">
                <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(0)}>
                  <ArrowLeft size={15} />
                  Previous 500
                </Button>
                <span className="muted text-small">
                  {ladder.data?.ladder.cached_since
                    ? "Cached " + new Date(ladder.data.ladder.cached_since).toLocaleString()
                    : "GGG ladder snapshot"}
                </span>
                <Button
                  variant="secondary"
                  disabled={offset === 500 || (ladder.data?.ladder.entries.length ?? 0) < 500}
                  onClick={() => setOffset(500)}
                >
                  Next 500 <ArrowRight size={15} />
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
