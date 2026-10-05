"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, GitBranch, Save, Search, Trash2, Undo2, Swords } from "lucide-react";
import { api } from "@/lib/client";
import { isAllocatablePassive, type Tree } from "@/lib/tree";
import { useWorkspace } from "@/lib/workspace-store";
import { downloadFile, exportBuild, type Build } from "@/lib/build";
import { Badge, Button, Field, Loading, Notice, PageTitle, SectionHeader } from "./ui";
import { TreeCanvas } from "./tree-canvas";
import { PassiveIcon } from "./artwork";
import { plannerTree } from "@/lib/tree-layout";
import {
  allocatePassive,
  buildPassives,
  normalizePassivePlan,
  passiveBudget,
  passiveRoots,
  refundPassive,
  type AllocationMode,
} from "@/lib/passive-plan";
import { PlannerSelect } from "./planner-select";
import styles from "./planner.module.css";

const emptyPlan = { shared: [], weapon1: [], weapon2: [] };
const modes = ["Shared", "Weapon set I", "Weapon set II"] as const;
export function Planner() {
  const store = useWorkspace(),
    [name, setName] = useState("My passive plan"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string>(),
    [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["tree"],
    queryFn: () => api<Tree>("tree"),
    staleTime: 86400000,
  });
  const classIndex = query.data?.classes.some((c) => c.index === store.classIndex)
    ? store.classIndex
    : (query.data?.classes[0]?.index ?? store.classIndex);
  const ascendancy = query.data?.classes
    .find((c) => c.index === classIndex)
    ?.ascendancies.some((a) => a.id === store.ascendancy)
    ? store.ascendancy
    : "";
  const mode = store.weaponSet ?? 0;
  const visibleTree = useMemo(() => {
    if (!query.data) return undefined;
    return plannerTree(query.data, ascendancy);
  }, [query.data, ascendancy]);
  const plan = useMemo(
    () =>
      query.data
        ? normalizePassivePlan(query.data, classIndex, ascendancy, {
            shared: store.allocations,
            weapon1: store.weaponSet1Allocations ?? [],
            weapon2: store.weaponSet2Allocations ?? [],
          })
        : emptyPlan,
    [
      query.data,
      classIndex,
      ascendancy,
      store.allocations,
      store.weaponSet1Allocations,
      store.weaponSet2Allocations,
    ],
  );
  const weaponAllocated = mode === 1 ? plan.weapon1 : mode === 2 ? plan.weapon2 : emptyPlan.shared;
  const allocated = useMemo(
    () => [
      ...plan.shared,
      ...(mode === 1 ? plan.weapon1 : mode === 2 ? plan.weapon2 : []),
      ...(visibleTree ? passiveRoots(visibleTree, classIndex, ascendancy) : []),
    ],
    [plan, mode, visibleTree, classIndex, ascendancy],
  );
  const budget = query.data
    ? passiveBudget(query.data, plan)
    : { shared: 0, weapon1: 0, weapon2: 0, regular: 0, ascendancy: 0 };
  const selectedNode = query.data?.nodes.find((n) => n.hash === selected),
    results = (visibleTree?.nodes ?? [])
      .filter(isAllocatablePassive)
      .filter((n) =>
        `${n.name} ${n.stats.join(" ")} ${n.id}`.toLowerCase().includes(search.toLowerCase()),
      )
      .slice(0, 40);
  function allocate() {
    if (!selected || !visibleTree) return;
    const result = allocatePassive(visibleTree, classIndex, ascendancy, plan, mode, selected);
    if (result.added) store.setPassivePlan(result.plan);
    setMessage(
      result.error ??
        `${result.added} connected passive${result.added === 1 ? "" : "s"} allocated to ${selectedNode?.ascendancy ? "Ascendancy" : modes[mode]}.`,
    );
  }
  function refund() {
    if (!selected || !visibleTree) return;
    const result = refundPassive(visibleTree, classIndex, ascendancy, plan, mode, selected);
    store.setPassivePlan(result.plan);
    setMessage(
      `${result.removed} passive allocation${result.removed === 1 ? "" : "s"} refunded.${result.removed > 1 ? " Disconnected passives were refunded too." : ""}`,
    );
  }
  function build(): Build {
    return {
      name: name.trim() || "My passive plan",
      ascendancy: ascendancy || undefined,
      description: "Created with the official PoE2 passive-tree export in Exile Atlas.",
      passives: query.data ? buildPassives(query.data, plan) : [],
      skills: [],
    };
  }
  return (
    <>
      <PageTitle
        eyebrow="TOOLS / PASSIVE PLANNER"
        title="The path is yours."
        description="Explore GGG’s official tree, connect your choices, and take your plan into the game."
        action={
          <div className="button-group">
            <Button
              variant="secondary"
              disabled={!query.data}
              onClick={() =>
                downloadFile(
                  (name || "passive-plan") + ".build",
                  exportBuild(build()),
                  "application/json",
                )
              }
            >
              <Download size={15} />
              Export .build
            </Button>
            <Button
              disabled={!query.data}
              onClick={() => {
                store.saveBuild(build());
                setMessage("Passive plan saved to your build library.");
              }}
            >
              <Save size={15} />
              Save to library
            </Button>
          </div>
        }
      />
      {query.isLoading ? (
        <Loading label="Loading the official PoE2 passive tree" />
      ) : query.error ? (
        <>
          <Notice error>{query.error.message}</Notice>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Retry tree export
          </Button>
        </>
      ) : (
        query.data &&
        visibleTree && (
          <>
            <div className="planner-toolbar">
              <Field label="Build name">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </Field>
              <div className="field">
                <PlannerSelect
                  label="Class"
                  value={String(classIndex)}
                  options={query.data.classes.map((c) => ({
                    value: String(c.index),
                    label: c.name,
                  }))}
                  onChange={(value) => {
                    store.setClassIndex(Number(value));
                    setSelected(undefined);
                    setMessage("");
                  }}
                />
              </div>
              <div className="field">
                <PlannerSelect
                  label="Ascendancy"
                  value={ascendancy}
                  options={[
                    { value: "", label: "Base tree" },
                    ...(query.data.classes
                      .find((c) => c.index === classIndex)
                      ?.ascendancies.map((a) => ({ value: a.id, label: a.name })) ?? []),
                  ]}
                  onChange={(next) => {
                    store.setPassivePlan(normalizePassivePlan(query.data!, classIndex, next, plan));
                    store.setAscendancy(next);
                    setSelected(undefined);
                    setMessage("");
                  }}
                />
              </div>
              <div className="allocated-count">
                <strong data-testid="regular-points-count">{budget.regular}</strong>
                <span>REGULAR POINTS REQUIRED</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  store.setPassivePlan(emptyPlan);
                  setMessage("All passive allocations reset.");
                }}
              >
                <Trash2 size={15} />
                Reset
              </Button>
            </div>
            <section className={styles.weaponPanel} aria-label="Weapon-set passives">
              <div className={styles.weaponHeading}>
                <Swords size={18} aria-hidden="true" />
                <div>
                  <strong>Weapon-set passives</strong>
                  <span>Choose which tree receives your next allocation.</span>
                </div>
                <span className={styles.ascendancyCount}>
                  <strong data-testid="ascendancy-points-count">{budget.ascendancy}</strong>{" "}
                  ascendancy
                </span>
              </div>
              <div className={styles.modes} role="tablist" aria-label="Passive allocation mode">
                {modes.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    id={`allocation-mode-${index}`}
                    aria-controls="active-passive-tree"
                    aria-selected={mode === index}
                    tabIndex={mode === index ? 0 : -1}
                    className={`${styles.mode} ${mode === index ? styles.active : ""} ${index === 1 ? styles.first : index === 2 ? styles.second : ""}`}
                    onClick={() => {
                      store.setWeaponSet(index as AllocationMode);
                      setMessage("");
                    }}
                    onKeyDown={(event) => {
                      const next =
                        event.key === "ArrowRight"
                          ? (index + 1) % 3
                          : event.key === "ArrowLeft"
                            ? (index + 2) % 3
                            : event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? 2
                                : undefined;
                      if (next !== undefined) {
                        event.preventDefault();
                        store.setWeaponSet(next as AllocationMode);
                        document.getElementById(`allocation-mode-${next}`)?.focus();
                      }
                    }}
                  >
                    <span>{label}</span>
                    <strong
                      data-testid={index ? `weapon-set-${index}-count` : "shared-points-count"}
                    >
                      {index === 0
                        ? `${budget.shared} points`
                        : `${index === 1 ? budget.weapon1 : budget.weapon2} / 24`}
                    </strong>
                  </button>
                ))}
              </div>
              <p className={styles.weaponHint}>
                Shared passives stay active in both sets. Each weapon set can specialise up to 24
                regular points. Keystones, jewel sockets, and ascendancy passives stay shared.
              </p>
            </section>
            {message && <Notice>{message}</Notice>}
            <div className="planner-layout">
              <section
                className="panel tree-panel"
                id="active-passive-tree"
                role="tabpanel"
                aria-labelledby={`allocation-mode-${mode}`}
              >
                <div className="tree-panel-heading">
                  <GitBranch size={17} />
                  <span>PASSIVE SKILL TREE</span>
                  <Badge tone="green">OFFICIAL EXPORT</Badge>
                </div>
                <TreeCanvas
                  tree={visibleTree}
                  ascendancy={ascendancy}
                  allocated={allocated}
                  weaponAllocated={weaponAllocated}
                  weaponSet={mode || undefined}
                  highlight={selected}
                  onSelect={setSelected}
                />
              </section>
              <aside className="panel node-panel">
                <SectionHeader title="Find a passive" />
                <label className="search-field">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, stat, or passive ID…"
                    aria-label="Search passive nodes"
                  />
                </label>
                {selectedNode && (
                  <div className="node-detail">
                    <PassiveIcon sprite={selectedNode.image} name={selectedNode.name} size={64} />
                    <Badge tone="amber">{selectedNode.kind.toUpperCase()}</Badge>
                    <h2>{selectedNode.name}</h2>
                    {selectedNode.stats.map((s, i) => (
                      <p key={i}>{s}</p>
                    ))}
                    <code>{selectedNode.id}</code>
                    {selectedNode.kind === "start" ? (
                      <Badge tone="amber">PERMANENT START</Badge>
                    ) : allocated.includes(selectedNode.hash) ? (
                      <>
                        <Badge tone="green">
                          {selectedNode.ascendancy
                            ? "ASCENDANCY"
                            : plan.shared.includes(selectedNode.hash)
                              ? "SHARED"
                              : modes[mode].toUpperCase()}
                        </Badge>
                        <Button
                          className={`full-width ${styles.refund}`}
                          variant="secondary"
                          onClick={refund}
                        >
                          <Undo2 size={14} />
                          Unallocate node
                        </Button>
                        <p className={styles.refundHint}>
                          Refunds any passives disconnected by this node.
                        </p>
                      </>
                    ) : isAllocatablePassive(selectedNode) ? (
                      <Button className="full-width" onClick={allocate}>
                        <PlusIcon />
                        Allocate connected path
                      </Button>
                    ) : (
                      <Badge>UNAVAILABLE</Badge>
                    )}
                  </div>
                )}
                <div className="node-results">
                  {results.map((n) => (
                    <button
                      key={n.hash}
                      aria-label={`Select passive: ${n.name}`}
                      aria-pressed={selected === n.hash}
                      className={`node-result ${selected === n.hash ? "selected" : ""}`}
                      onClick={() => setSelected(n.hash)}
                    >
                      <PassiveIcon
                        sprite={allocated.includes(n.hash) ? n.image : (n.inactiveImage ?? n.image)}
                        name={n.name}
                      />
                      <div>
                        <strong>{n.name}</strong>
                        <small>{n.stats[0] ?? n.id}</small>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="fine-print">
                  Showing up to 40 matches. The planner connects shortest paths from your class
                  start. Regular points required use the shared tree plus the larger weapon set.
                  Level and quest-point totals are not enforced.
                </p>
              </aside>
            </div>
          </>
        )
      )}
    </>
  );
}
function PlusIcon() {
  return <span aria-hidden="true">＋</span>;
}
