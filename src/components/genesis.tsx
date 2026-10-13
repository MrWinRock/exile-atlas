"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sprout, Download, Copy, Pencil, Trash2 } from "lucide-react";
import { GENESIS_BRANCHES, parseGenesisData, type GenesisBranch } from "@/lib/genesis-data";
import {
  createGenesisPlan,
  genesisCounts,
  genesisPath,
  allocateGenesisPath,
  refundGenesisNode,
  validateGenesisPlan,
  repairGenesisPlan,
} from "@/lib/genesis-plan";
import { useGenesisWorkspace } from "@/lib/genesis-store";
import { exportGenesisPlans } from "@/lib/genesis-presets";
import { downloadFile } from "@/lib/build";
import { GenesisGraph } from "./genesis-graph";
import { PassiveIcon } from "./artwork";
import { Badge, Button, Field, Loading, Notice, PageTitle, SectionHeader } from "./ui";
import styles from "./genesis.module.css";
export function Genesis() {
  const query = useQuery({
    queryKey: ["genesis-snapshot"],
    queryFn: async ({ signal }) => {
      const r = await fetch("/data/poe2-genesis.json", { signal });
      if (!r.ok) throw new Error("The Genesis snapshot could not be loaded.");
      return parseGenesisData(await r.json());
    },
    staleTime: Infinity,
  });
  const store = useGenesisWorkspace(),
    [branch, setBranch] = useState<GenesisBranch>("Currency"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [preview, setPreview] = useState<string>(),
    [name, setName] = useState(""),
    [edited, setEdited] = useState<string>(),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState(""),
    [rename, setRename] = useState(""),
    [renameText, setRenameText] = useState("");
  const data = query.data;
  if (!data)
    return (
      <>
        <PageTitle
          eyebrow="WORKSPACE / GENESIS TREE"
          title="Grow a plan worth keeping."
          description="Explore the crafting branches and plan your next rewards."
        />
        {query.error ? (
          <Notice error>
            {query.error.message}{" "}
            <a href="https://poe2db.tw/us/The_Genesis_Tree" target="_blank" rel="noreferrer">
              Open the Genesis reference ↗
            </a>{" "}
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Retry snapshot
            </Button>
          </Notice>
        ) : (
          <Loading label="Loading Genesis snapshot" />
        )}
      </>
    );
  const plan = store.current ?? createGenesisPlan(data),
    counts = genesisCounts(data, plan),
    errors = validateGenesisPlan(data, plan),
    node = data.nodes.find((n) => n.id === selected),
    path = preview ? genesisPath(data, plan, preview) : undefined;
  const matches = data.nodes.filter(
    (n) =>
      n.branch === branch &&
      `${n.name} ${n.effects.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedValid = !!node && node.branch === branch;
  const selectionPath = node ? genesisPath(data, plan, node.id) : undefined;
  function chooseBranch(value: GenesisBranch) {
    setBranch(value);
    setSelected("");
    setPreview(undefined);
    setSearch("");
  }
  function download(plans = store.plans, filename = "exile-atlas-genesis.json") {
    try {
      downloadFile(filename, exportGenesisPlans(plans), "application/json");
      setMessage("Genesis plans exported.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE / GENESIS TREE"
        title="Grow a plan worth keeping."
        description="Trace a connected path through the crafting tree. Keep every branch’s choices together."
        action={<Badge tone="green">LOCAL PLANNER</Badge>}
      />
      <Notice>
        Historical snapshot · {data.captured} · source version {data.patch}. Current-patch parity is
        unverified.{" "}
        <a
          className="text-link"
          href="/data/poe2-genesis.NOTICE.md"
          target="_blank"
          rel="noreferrer"
        >
          Data provenance ↗
        </a>
      </Notice>
      <div className={styles.branches}>
        {GENESIS_BRANCHES.map((b) => (
          <button
            key={b}
            aria-label={b}
            aria-pressed={branch === b}
            onClick={() => chooseBranch(b)}
          >
            <Sprout size={16} />
            <span>{b}</span>
            <strong>
              {counts[b]}
              <small>{plan.budgets[b] !== undefined ? ` / ${plan.budgets[b]}` : " points"}</small>
            </strong>
          </button>
        ))}
      </div>
      {store.warning && <Notice error>{store.warning}</Notice>}
      {errors.length > 0 && <Notice error>{errors.join(" ")}</Notice>}
      {errors.some(
        (e) => e.startsWith("Disconnected node:") || e.startsWith("Roots are implicit"),
      ) && (
        <Notice>
          Repair adds missing connected paths and removes implicit roots from the point count. Known
          planned nodes and unrelated branches are retained.
          <Button
            variant="secondary"
            onClick={() => {
              const result = repairGenesisPlan(data, plan);
              if (result.error) setMessage(result.error);
              else {
                store.setPlan(result.plan);
                setMessage("Connections repaired. All known planned nodes are retained.");
              }
            }}
          >
            Repair connections
          </Button>
        </Notice>
      )}
      {plan.dataset !== data.identity && (
        <Button
          variant="secondary"
          onClick={() => {
            const candidate = { ...plan, dataset: data.identity };
            const e = validateGenesisPlan(data, candidate).filter((e) =>
              e.startsWith("Unknown node:"),
            );
            if (e.length) setMessage(e.join(" "));
            else {
              store.setPlan(candidate);
              setMessage("Dataset identity updated after reviewing the node IDs.");
            }
          }}
        >
          Use current dataset after review
        </Button>
      )}
      {plan.allocated
        .filter((id) => !data.nodes.some((n) => n.id === id))
        .map((id) => (
          <Button
            key={id}
            variant="ghost"
            onClick={() =>
              store.setPlan({ ...plan, allocated: plan.allocated.filter((n) => n !== id) })
            }
          >
            Remove unknown node {id}
          </Button>
        ))}
      <div className={styles.workspace}>
        <section className={styles.explorer}>
          <GenesisGraph
            key={data.identity + branch}
            data={data}
            allocated={plan.allocated}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              setPreview(undefined);
            }}
            branch={branch}
          />
          <div className={`panel ${styles.nodeBrowser}`}>
            <div className={styles.searchRow}>
              <Field label="Search Genesis nodes">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search node names and crafting effects…"
                />
              </Field>
              <Field
                label={`${branch} planning budget`}
                hint="Your budget; the game’s limit is not detected"
              >
                <input
                  aria-label={`${branch} planning budget`}
                  type="number"
                  min={0}
                  max={5000}
                  step={1}
                  value={plan.budgets[branch] ?? ""}
                  placeholder="No limit"
                  onChange={(e) => {
                    const budgets = { ...plan.budgets };
                    if (!e.target.value) delete budgets[branch];
                    else {
                      const number = Number(e.target.value);
                      if (!Number.isInteger(number) || number < 0 || number > 5000) {
                        setMessage("Use a whole-number budget from 0 to 5000.");
                        return;
                      }
                      budgets[branch] = number;
                    }
                    store.setPlan({ ...plan, budgets });
                  }}
                />
              </Field>
            </div>
            {branch === "Breachstones" && (
              <p className="muted">
                This historical graph contains only the Breachstone Womb; no additional passives are
                provided.
              </p>
            )}
            <div className={styles.nodeList}>
              {matches.map((n) => (
                <button
                  key={n.id}
                  aria-label={`Select ${n.name} (${n.id})`}
                  aria-pressed={selected === n.id}
                  onClick={() => {
                    setSelected(n.id);
                    setPreview(undefined);
                  }}
                >
                  <PassiveIcon sprite={n.sprite} name={n.name} size={34} />
                  <span>
                    {n.name}
                    <small>{n.root ? "Branch root" : (n.effects[0] ?? n.id)}</small>
                  </span>
                  <span>{n.root ? "Root" : plan.allocated.includes(n.id) ? "Allocated" : "○"}</span>
                </button>
              ))}
              {!matches.length && <p className="muted">No nodes match this search.</p>}
            </div>
          </div>
        </section>
        <aside className={styles.details}>
          <section className="panel">
            <SectionHeader title="Your next choice" />
            {selectedValid && node ? (
              <>
                <span className="eyebrow">
                  {node.branch} ·{" "}
                  {node.root
                    ? "ROOT"
                    : plan.allocated.includes(node.id)
                      ? "ALLOCATED"
                      : "UNALLOCATED"}
                </span>
                <h2 className={styles.nodeTitle}>{node.name}</h2>
                <span data-testid="genesis-selected-art">
                  <PassiveIcon sprite={node.sprite} name={node.name} size={76} />
                </span>
                <ul className={styles.effects}>
                  {node.effects.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {node.effects.some((e) => e.startsWith("Option (")) && (
                  <p className="fine-print">
                    Options are source references; their selection mechanics are not simulated.
                  </p>
                )}
                <code className={styles.nodeId}>{node.id}</code>
                {!node.root &&
                  (plan.allocated.includes(node.id) ? (
                    <Button
                      variant="secondary"
                      disabled={errors.some((e) => !e.includes("planning budget"))}
                      onClick={() => {
                        store.setPlan(refundGenesisNode(data, plan, node.id));
                        setPreview(undefined);
                        setMessage("Node refunded with any disconnected descendants.");
                      }}
                    >
                      Refund node
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={!!selectionPath?.error && !selectionPath.ids.length}
                      onClick={() => setPreview(node.id)}
                    >
                      Preview allocation
                    </Button>
                  ))}
                {path && (
                  <div className={styles.path}>
                    <strong>{path.ids.length} points to allocate</strong>
                    <ol>
                      {path.ids.map((id) => (
                        <li key={id}>{data.nodes.find((n) => n.id === id)?.name ?? id}</li>
                      ))}
                    </ol>
                    {path.error && <Notice error>{path.error}</Notice>}
                    <Button
                      disabled={!!path.error || !path.ids.length}
                      onClick={() => {
                        const result = allocateGenesisPath(data, plan, node.id);
                        if (result.error) setMessage(result.error);
                        else {
                          store.setPlan(result.plan);
                          setPreview(undefined);
                          setMessage("Connected path allocated.");
                        }
                      }}
                    >
                      Allocate path
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                <Sprout size={30} />
                <p>Select a node on the tree or in the list to inspect its crafting effects.</p>
              </div>
            )}
            <p className={styles.source}>
              <a href="https://poe2db.tw/us/The_Genesis_Tree" target="_blank" rel="noreferrer">
                Current Genesis reference ↗
              </a>
            </p>
          </section>
          <section className="panel">
            <SectionHeader title="Keep this plan" />
            <Field label="Genesis plan name">
              <input
                value={name}
                maxLength={120}
                placeholder="e.g. Divine growth"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={() => {
                  store.setPlan(plan);
                  const r = store.savePlan(name);
                  setMessage(r.ok ? "Genesis plan saved." : r.error!);
                }}
              >
                Save Genesis plan
              </Button>
              {edited && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    store.setPlan(plan);
                    const r = store.savePlan(name, edited);
                    setMessage(r.ok ? "Genesis plan updated." : r.error!);
                  }}
                >
                  Update Genesis plan
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  store.resetCurrent(data);
                  setEdited(undefined);
                  setPreview(undefined);
                  setMessage("Current plan reset. Saved plans are kept.");
                }}
              >
                Reset current plan
              </Button>
            </div>
            <p className="fine-print">
              Allocated effects are references, not calculated crafting odds. Your in-game unlocks
              and point limits are not detected.
            </p>
          </section>
          {message && <Notice>{message}</Notice>}
          <section className="panel">
            <SectionHeader title="Wombgift reference" />
            <div className={styles.wombgifts}>
              {data.wombgifts.map((w) => (
                <div key={w.name}>
                  <strong>{w.name}</strong>
                  <span>{w.branch}</span>
                  <small>{w.description}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <section className={`panel ${styles.library}`}>
        <SectionHeader
          title="Your Genesis plans"
          aside={<span className="muted">{store.plans.length} / 100</span>}
        />
        <div className={styles.searchRow}>
          <Field label="Search saved Genesis plans">
            <input value={filter} onChange={(e) => setFilter(e.target.value)} />
          </Field>
          <Button variant="secondary" disabled={!store.plans.length} onClick={() => download()}>
            <Download size={15} />
            Export Genesis plans
          </Button>
        </div>
        <Field label="Import Genesis plans">
          <input
            aria-label="Import Genesis plans"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 1048576) throw new Error("Genesis imports must be at most 1 MiB.");
                const r = store.importPlans(await file.text());
                setMessage(r.ok ? "Genesis plans imported as copies." : r.error!);
              } catch (error) {
                setMessage((error as Error).message);
              }
            }}
          />
        </Field>
        {!store.plans.length && (
          <p className={styles.empty}>Save your first plan to build a library.</p>
        )}
        <div className={styles.planGrid}>
          {store.plans
            .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
            .map((p) => (
              <article key={p.id}>
                <h3>{p.name}</h3>
                <p className="muted">{p.plan.allocated.length} planned nodes</p>
                {validateGenesisPlan(data, p.plan).length > 0 && (
                  <p className={styles.warning}>Needs review · dataset or allocation mismatch</p>
                )}
                {rename === p.id ? (
                  <div>
                    <Field label="Rename Genesis plan">
                      <input
                        value={renameText}
                        maxLength={120}
                        onChange={(e) => setRenameText(e.target.value)}
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const r = store.renamePlan(p.id, renameText);
                        if (r.ok) setRename("");
                        else setMessage(r.error!);
                      }}
                    >
                      Save plan name
                    </Button>
                    <Button variant="ghost" onClick={() => setRename("")}>
                      Cancel rename
                    </Button>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      aria-label={`Load ${p.name}`}
                      onClick={() => {
                        store.loadPlan(p.id);
                        setName(p.name);
                        setEdited(p.id);
                        setPreview(undefined);
                        setMessage("Plan loaded for review.");
                      }}
                    >
                      Load
                    </Button>
                    <button
                      className="icon-button"
                      aria-label={`Duplicate ${p.name}`}
                      onClick={() => {
                        const r = store.duplicatePlan(p.id);
                        if (!r.ok) setMessage(r.error!);
                      }}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Rename ${p.name}`}
                      onClick={() => {
                        setRename(p.id);
                        setRenameText(p.name);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Export ${p.name}`}
                      onClick={() => download([p], p.name + ".json")}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => store.deletePlan(p.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </article>
            ))}
        </div>
      </section>
      <section className={`panel ${styles.allocated}`}>
        <SectionHeader title="Allocated effect references" />
        {data.nodes
          .filter((n) => plan.allocated.includes(n.id))
          .map((n) => (
            <div key={n.id}>
              <strong>{n.name}</strong>
              <small>
                {n.branch} · {n.id}
              </small>
              <ul>
                {n.effects.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ))}
        {!plan.allocated.length && (
          <p className="muted">
            Allocate a connected path to collect its effect descriptions here.
          </p>
        )}
      </section>
    </>
  );
}
