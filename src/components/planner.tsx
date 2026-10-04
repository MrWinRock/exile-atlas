"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Download, GitBranch, Save, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { allocationPath, isAllocatablePassive, validAllocations, type Tree } from "@/lib/tree";
import { useWorkspace } from "@/lib/workspace-store";
import { downloadFile, exportBuild, type Build } from "@/lib/build";
import { Badge, Button, Field, Loading, Notice, PageTitle, SectionHeader } from "./ui";
import { TreeCanvas } from "./tree-canvas";
import { PassiveIcon } from "./artwork";
import { plannerTree } from "@/lib/tree-layout";
export function Planner() {
  const store = useWorkspace(),
    [name, setName] = useState("My passive plan"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string>(),
    [ascendancy, setAscendancy] = useState(""),
    [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["tree"],
    queryFn: () => api<Tree>("tree"),
    staleTime: 86400000,
  });
  const visibleTree = useMemo(() => {
    if (!query.data) return undefined;
    return plannerTree(query.data, ascendancy);
  }, [query.data, ascendancy]);
  const planned = validAllocations(query.data, store.allocations),
    start = query.data?.nodes.find((n) => n.classStarts.includes(store.classIndex)),
    allocated = useMemo(
      () => [
        ...new Set([
          ...(start ? [start.hash] : []),
          ...validAllocations(query.data, store.allocations),
        ]),
      ],
      [start, query.data, store.allocations],
    );
  const selectedNode = query.data?.nodes.find((n) => n.hash === selected),
    results = (visibleTree?.nodes ?? [])
      .filter(isAllocatablePassive)
      .filter((n) =>
        `${n.name} ${n.stats.join(" ")} ${n.id}`.toLowerCase().includes(search.toLowerCase()),
      )
      .slice(0, 40);
  function allocate() {
    if (!selected || !visibleTree) return;
    const path = allocationPath(visibleTree, allocated, selected);
    if (path.length) {
      store.setAllocations([...new Set([...planned, ...path])]);
      setMessage(
        `${path.length} connected passive${path.length === 1 ? "" : "s"} added to your plan.`,
      );
    } else
      setMessage(
        "This node is already allocated or has no path from this class in the visible tree.",
      );
  }
  function build(): Build {
    return {
      name: name.trim() || "My passive plan",
      ascendancy: ascendancy || undefined,
      description: "Created with the official PoE2 passive-tree export in Exile Atlas.",
      passives: (visibleTree?.nodes ?? [])
        .filter((n) => planned.includes(n.hash) && isAllocatablePassive(n) && n.kind !== "start")
        .map((n) => n.id),
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
              <Field label="Class">
                <select
                  value={store.classIndex}
                  onChange={(e) => {
                    store.setClassIndex(Number(e.target.value));
                    setAscendancy("");
                    setSelected(undefined);
                  }}
                >
                  {query.data.classes.map((c) => (
                    <option value={c.index} key={c.index}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ascendancy">
                <select
                  value={ascendancy}
                  onChange={(e) => {
                    const next = e.target.value;
                    store.setAllocations(
                      store.allocations.filter((hash) => {
                        const node = query.data!.nodes.find((n) => n.hash === hash);
                        return node && (!node.ascendancy || node.ascendancy === next);
                      }),
                    );
                    setAscendancy(next);
                    setSelected(undefined);
                  }}
                >
                  <option value="">Base tree</option>
                  {query.data.classes
                    .find((c) => c.index === store.classIndex)
                    ?.ascendancies.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="allocated-count">
                <strong>{planned.length}</strong>
                <span>PASSIVES PLANNED</span>
              </div>
              <Button variant="ghost" onClick={() => store.setAllocations([])}>
                <Trash2 size={15} />
                Reset
              </Button>
            </div>
            {message && (
              <Notice>
                {message}{" "}
                <Link href="/builds" className="text-link">
                  Open library <ArrowUpRight size={13} />
                </Link>
              </Notice>
            )}
            <div className="planner-layout">
              <section className="panel tree-panel">
                <div className="tree-panel-heading">
                  <GitBranch size={17} />
                  <span>PASSIVE SKILL TREE</span>
                  <Badge tone="green">OFFICIAL EXPORT</Badge>
                </div>
                <TreeCanvas
                  tree={visibleTree}
                  ascendancy={ascendancy}
                  allocated={allocated}
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
                    {allocated.includes(selectedNode.hash) ? (
                      <Badge tone="green">ALLOCATED</Badge>
                    ) : (
                      <Button className="full-width" onClick={allocate}>
                        <PlusIcon />
                        Allocate connected path
                      </Button>
                    )}
                  </div>
                )}
                <div className="node-results">
                  {results.map((n) => (
                    <button
                      key={n.hash}
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
                  start. It does not calculate damage or enforce quest-point budgets.
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
