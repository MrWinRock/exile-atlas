"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, Download, Save, Trash2, Undo2 } from "lucide-react";
import { ATLAS_BRANCHES, parseAtlasData, type AtlasBranch } from "@/lib/atlas-data";
import {
  allocateAtlasPath,
  atlasCounts,
  atlasPath,
  createAtlasPlan,
  refundAtlasNode,
  validateAtlasPlan,
  type AtlasPlan,
} from "@/lib/atlas-plan";
import { useAtlasDraft, useAtlasPlans } from "@/lib/atlas-store";
import { downloadFile } from "@/lib/build";
import { PassiveIcon } from "./artwork";
import { PlanningGraph } from "./planning-graph";
import { Badge, Button, Field, Loading, Notice, PageTitle, SectionHeader } from "./ui";
import styles from "./atlas-planner.module.css";

type Checkpoint = {
  plan: AtlasPlan;
  branch: AtlasBranch;
  selected: string;
  name: string;
  savedId?: string;
};
export function AtlasPlanner() {
  const draft = useAtlasDraft(),
    library = useAtlasPlans();
  const [branch, setBranch] = useState<AtlasBranch>("Core"),
    [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [name, setName] = useState("My Atlas plan"),
    [history, setHistory] = useState<Checkpoint[]>([]),
    [message, setMessage] = useState(""),
    [savedId, setSavedId] = useState<string>();
  const query = useQuery({
    queryKey: ["atlas-tree"],
    queryFn: async () => {
      const response = await fetch("/data/poe2-atlas.json");
      if (!response.ok) throw new Error("The Atlas snapshot could not be loaded.");
      return parseAtlasData(await response.json());
    },
    staleTime: 86400000,
  });
  const title = (
    <PageTitle
      eyebrow="TOOLS / ATLAS PLANNER"
      title="Shape your endgame."
      description="Plan connected Atlas passives, compare your branches, and save the route you want to take."
    />
  );
  if (!query.data || !draft.loaded || !library.loaded)
    return (
      <>
        {title}
        {query.error ? (
          <Notice error>
            {query.error.message}{" "}
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Retry Atlas data
            </Button>
          </Notice>
        ) : (
          <Loading label="Loading Atlas planner" />
        )}
      </>
    );
  const data = query.data,
    plan = draft.current ?? createAtlasPlan(data),
    counts = atlasCounts(data, plan),
    errors = validateAtlasPlan(data, plan);
  const node = data.nodes.find((n) => n.id === selected && n.branch === branch),
    path =
      node && !node.root && !node.decorative && !plan.allocated.includes(node.id)
        ? atlasPath(data, plan, node.id)
        : undefined;
  const branches = ATLAS_BRANCHES.filter((b) => data.nodes.some((n) => n.branch === b));
  const matches = data.nodes.filter(
    (n) =>
      n.branch === branch &&
      `${n.name} ${n.effects.join(" ")} ${n.id} ${n.sourceId ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function attempt(action: () => void) {
    try {
      action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The Atlas plan could not be updated.");
    }
  }
  function change(next: AtlasPlan, context?: Pick<Checkpoint, "name" | "savedId" | "selected">) {
    const nextName = context?.name ?? name,
      nextSavedId = context ? context.savedId : savedId,
      nextSelected = context?.selected ?? selected;
    if (
      JSON.stringify(next) === JSON.stringify(plan) &&
      nextName === name &&
      nextSavedId === savedId &&
      nextSelected === selected
    )
      return;
    draft.setPlan(next);
    setHistory((h) => [
      ...h.slice(-49),
      structuredClone({ plan, branch, selected, name, savedId }),
    ]);
    setName(nextName);
    setSavedId(nextSavedId);
    setSelected(nextSelected);
  }
  function undo() {
    const checkpoint = history.at(-1);
    if (!checkpoint) return;
    draft.setPlan(checkpoint.plan);
    setBranch(checkpoint.branch);
    setSelected(checkpoint.selected);
    setName(checkpoint.name);
    setSavedId(checkpoint.savedId);
    setHistory(history.slice(0, -1));
    setMessage("Last Atlas change undone.");
  }
  function exportCurrent() {
    downloadFile(
      "atlas-plan.json",
      JSON.stringify(
        {
          format: "exile-atlas-atlas",
          version: 1,
          records: [{ id: crypto.randomUUID(), name: name.trim() || "My Atlas plan", plan }],
        },
        null,
        2,
      ),
      "application/json",
    );
  }
  return (
    <>
      {title}
      <div className={styles.toolbar}>
        <Badge tone="green">ATLAS SNAPSHOT</Badge>
        <span>
          {plan.allocated.length} planned nodes · {library.records.length} saved plans
        </span>
        <div className="button-group">
          <Button
            variant="secondary"
            aria-label="Undo Atlas change"
            title="Undo the last 50 changes during this visit"
            disabled={!history.length}
            onClick={() => attempt(undo)}
          >
            <Undo2 size={15} /> Undo
          </Button>
          <Button
            variant="secondary"
            aria-label="Reset Atlas plan"
            onClick={() =>
              attempt(() => {
                change(createAtlasPlan(data), {
                  name: "My Atlas plan",
                  savedId: undefined,
                  selected: "",
                });
                setMessage("New Atlas plan started. Saved plans are kept.");
              })
            }
          >
            <Trash2 size={15} /> New plan
          </Button>
          <Button variant="secondary" onClick={() => attempt(exportCurrent)}>
            <Download size={15} /> Export current Atlas plan
          </Button>
        </div>
      </div>
      {[draft.warning, library.warning].filter(Boolean).map((warning) => (
        <Notice key={warning} error>
          {warning}
        </Notice>
      ))}
      {message && <Notice>{message}</Notice>}
      {errors.length > 0 && (
        <Notice error>
          <strong>This draft needs review.</strong>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p>
            Export a backup, then start a new plan to replace this draft. Saved library records
            remain available.
          </p>
        </Notice>
      )}
      <div className={styles.branches} role="tablist" aria-label="Atlas branches">
        {branches.map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={branch === b}
            onClick={() => {
              setBranch(b);
              setSelected("");
              setSearch("");
            }}
          >
            <span>{b}</span>
            <strong data-testid={`atlas-${b}-count`}>{counts[b]}</strong>
            <small>
              {plan.budgets[b] === undefined ? "planned points" : `of ${plan.budgets[b]} budget`}
            </small>
          </button>
        ))}
      </div>
      <div className={styles.workspace}>
        <section className={styles.explorer}>
          <PlanningGraph
            key={data.identity + branch}
            data={data}
            branch={branch}
            label="Atlas"
            compact
            allocated={plan.allocated}
            selected={selected}
            onSelect={setSelected}
          />
          <section className={`panel ${styles.browser}`}>
            <div className={styles.searchRow}>
              <Field label="Search Atlas nodes">
                <input
                  aria-label="Search Atlas nodes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, stat, or source ID…"
                />
              </Field>
              <Field
                label={`${branch} planning budget`}
                hint="Your available points; no game limit is assumed"
              >
                <input
                  aria-label={`${branch} planning budget`}
                  type="number"
                  min={0}
                  max={5000}
                  step={1}
                  placeholder="No limit"
                  value={plan.budgets[branch] ?? ""}
                  onChange={(e) =>
                    attempt(() => {
                      const budgets = { ...plan.budgets };
                      if (e.target.value === "") delete budgets[branch];
                      else {
                        const budget = Number(e.target.value);
                        if (!Number.isInteger(budget) || budget < 0 || budget > 5000)
                          throw new Error("Use a whole-number budget from 0 to 5000.");
                        budgets[branch] = budget;
                      }
                      change({ ...plan, budgets });
                    })
                  }
                />
              </Field>
            </div>
            <div className={styles.nodeList}>
              {matches.map((n) => (
                <button
                  key={n.id}
                  aria-label={`Select Atlas ${n.name} (${n.id})`}
                  aria-pressed={selected === n.id}
                  onClick={() => setSelected(n.id)}
                >
                  <PassiveIcon sprite={n.sprite} name={n.name} size={36} />
                  <span>
                    {n.name}
                    <small>
                      {n.decorative
                        ? "Illustration · no points"
                        : n.root
                          ? "Branch root · no points"
                          : (n.effects[0] ?? n.sourceId)}
                    </small>
                  </span>
                  <span>{plan.allocated.includes(n.id) ? "Allocated" : n.root ? "Root" : ""}</span>
                </button>
              ))}
              {!matches.length && <p className="muted">No Atlas nodes match this search.</p>}
            </div>
          </section>
        </section>
        <aside className={styles.details}>
          <section className="panel">
            <SectionHeader title="Your next Atlas choice" />
            {node ? (
              <>
                <div className={styles.nodeHeading}>
                  <span data-testid="atlas-selected-art">
                    <PassiveIcon sprite={node.sprite} name={node.name} size={72} />
                  </span>
                  <div>
                    <span className="eyebrow">
                      {node.branch} ·{" "}
                      {node.decorative
                        ? "ILLUSTRATION"
                        : node.root
                          ? "ROOT"
                          : node.kind.toUpperCase()}
                    </span>
                    <h2>{node.name}</h2>
                  </div>
                </div>
                <ul className={styles.effects}>
                  {node.effects.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                <p className="fine-print">
                  Source effects are references. Unlocks, conditional choices and reward outcomes
                  are not simulated.
                </p>
                {node.decorative && (
                  <p className="muted">This illustration does not allocate points.</p>
                )}
                <code className={styles.nodeId}>
                  {node.sourceId ?? node.id} · {node.id}
                </code>
                {path && (
                  <div className={styles.path}>
                    <strong>{path.ids.length} points to allocate</strong>
                    {path.error ? (
                      <p className={styles.error}>{path.error}</p>
                    ) : (
                      <ol>
                        {path.ids.map((id) => (
                          <li key={id}>{data.nodes.find((n) => n.id === id)?.name}</li>
                        ))}
                      </ol>
                    )}
                    <Button
                      disabled={!!path.error || !path.ids.length}
                      aria-label="Allocate Atlas path"
                      onClick={() =>
                        attempt(() => {
                          const result = allocateAtlasPath(data, plan, node.id);
                          if (result.error) throw new Error(result.error);
                          change(result.plan);
                          setMessage("Connected Atlas path allocated.");
                        })
                      }
                    >
                      Allocate path
                    </Button>
                  </div>
                )}
                {plan.allocated.includes(node.id) && (
                  <Button
                    variant="secondary"
                    aria-label="Refund Atlas node"
                    disabled={errors.some((e) => !e.includes("planning budget"))}
                    onClick={() =>
                      attempt(() => {
                        change(refundAtlasNode(data, plan, node.id));
                        setMessage("Node and disconnected descendants refunded.");
                      })
                    }
                  >
                    Refund node
                  </Button>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                <Compass size={32} />
                <p>
                  Select a node on the tree or in the searchable list to inspect its effects and
                  connected path.
                </p>
              </div>
            )}
          </section>
          <section className="panel">
            <SectionHeader title="Keep your route" />
            <Field label="Atlas plan name">
              <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="button-group">
              <Button
                disabled={!!errors.length || !name.trim()}
                onClick={() =>
                  attempt(() => {
                    const id = library.save({ id: crypto.randomUUID(), name, plan });
                    setSavedId(id);
                    setMessage("Atlas plan saved in this browser.");
                  })
                }
              >
                <Save size={15} /> Save Atlas plan
              </Button>
              {savedId && library.records.some((p) => p.id === savedId) && (
                <Button
                  variant="secondary"
                  disabled={!!errors.length || !name.trim()}
                  onClick={() =>
                    attempt(() => {
                      library.save({ id: savedId, name, plan });
                      setMessage("Saved Atlas plan updated.");
                    })
                  }
                >
                  Update Atlas plan
                </Button>
              )}
            </div>
            <p className="fine-print">
              Draft changes save in this browser. Undo retains the last 50 changes during this
              visit. Export files to keep portable backups.
            </p>
            <details className={styles.source}>
              <summary>Snapshot and artwork sources</summary>
              <p>
                <a href={data.source} target="_blank" rel="noreferrer">
                  RePoE PoE2 Atlas source ↗
                </a>{" "}
                · {data.captured} · source patch {data.patch}
              </p>
              <p>
                {data.nodes.length} source records · {data.nodes.filter((n) => n.root).length}{" "}
                independent roots. This bundled snapshot is not automatically refreshed.
              </p>
              {data.artwork && (
                <p>
                  <a href={data.artwork.source} target="_blank" rel="noreferrer">
                    Game artwork snapshot ↗
                  </a>{" "}
                  · {data.artwork.captured} · art patch {data.artwork.patch}
                </p>
              )}
            </details>
          </section>
        </aside>
      </div>
      <section className={`panel ${styles.library}`}>
        <SectionHeader title="Your Atlas plans" aside={`${library.records.length} / 100 saved`} />
        <div className={styles.backups}>
          <Button
            variant="secondary"
            onClick={() =>
              attempt(() =>
                downloadFile("exile-atlas-atlas.json", library.exportJson(), "application/json"),
              )
            }
          >
            <Download size={15} /> Export Atlas plans
          </Button>
          <Field label="Import Atlas plans">
            <input
              aria-label="Import Atlas plans"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 1048576) throw new Error("Imports must be at most 1 MiB.");
                  library.importJson(await file.text());
                  setMessage("Atlas plans imported as copies.");
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Import failed.");
                }
                e.target.value = "";
              }}
            />
          </Field>
        </div>
        {!library.records.length && (
          <p className="muted">Save a plan to revisit your mapping route.</p>
        )}
        <div className={styles.planGrid}>
          {library.records.map((p) => (
            <article key={p.id}>
              <h3>{p.name}</h3>
              <p>{p.plan.allocated.length} planned nodes</p>
              {p.plan.dataset !== data.identity && (
                <p className={styles.error}>Different dataset · review before use</p>
              )}
              <div className="button-group">
                <Button
                  variant="secondary"
                  aria-label={`Load ${p.name}`}
                  onClick={() =>
                    attempt(() => {
                      change(p.plan, { name: p.name, savedId: p.id, selected: "" });
                      setMessage("Atlas plan loaded.");
                    })
                  }
                >
                  Load
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Duplicate ${p.name}`}
                  onClick={() => attempt(() => library.duplicate(p.id))}
                >
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => attempt(() => library.remove(p.id))}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
