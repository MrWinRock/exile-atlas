"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace-store";
import { parseBuild, downloadFile, type Build } from "@/lib/build";
import {
  compareBuilds,
  exportBuildComparison,
  buildComparisonDisplay,
  type SectionDifference,
  type ComparisonEntry,
} from "@/lib/build-comparison";
import { useGameData } from "@/lib/game-data-store";
import { prepareItemTransfer, saveItemTransfer } from "@/lib/item-transfer";
import { api } from "@/lib/client";
import type { Tree } from "@/lib/tree";
import type { AllocationMode } from "@/lib/passive-plan";
import { TreeCanvas } from "./tree-canvas";
import { Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
import styles from "./build-comparison.module.css";
type ImportCopy = { id: string; build: Build; fileName: string };
export function BuildComparison() {
  return (
    <Suspense fallback={<p>Loading comparison…</p>}>
      <ComparisonContent />
    </Suspense>
  );
}
function ComparisonContent() {
  const store = useWorkspace(),
    data = useGameData(),
    params = useSearchParams(),
    router = useRouter();
  const [leftSelection, setLeftSelection] = useState<string>(),
    [rightSelection, setRightSelection] = useState(""),
    [imports, setImports] = useState<ImportCopy[]>([]),
    [differencesOnly, setDifferencesOnly] = useState(true),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState<AllocationMode>(0),
    [both, setBoth] = useState(true),
    [selected, setSelected] = useState<string>();
  const leftId = leftSelection ?? params.get("left") ?? "",
    rightId = rightSelection;
  const inputs = [
    ...store.builds.map((b) => ({ id: b.id, build: b.build, fileName: "saved" })),
    ...imports,
  ];
  const left = inputs.find((b) => b.id === leftId),
    right = inputs.find((b) => b.id === rightId);
  const query = useQuery({
    queryKey: ["tree"],
    queryFn: () => api<Tree>("tree"),
    staleTime: 86400000,
  });
  const diff = useMemo(
    () => (left && right ? compareBuilds(left.build, right.build, query.data) : undefined),
    [left, right, query.data],
  );
  const report =
    diff && left && right
      ? exportBuildComparison(
          [
            { name: left.build.name, id: left.id },
            { name: right.build.name, id: right.id },
          ],
          diff,
          {
            tree: query.data?.revision ?? "version unrecorded",
            gameData: data.snapshot?.id ?? "version unrecorded",
          },
        )
      : undefined;
  async function importFile(file: File, side: 0 | 1) {
    try {
      if (file.size > 1048576) throw new Error("Build imports must be at most 1 MiB");
      const text = await file.text();
      if (new TextEncoder().encode(text).length > 1048576)
        throw new Error("Build imports must be at most 1 MiB");
      const build = parseBuild(text),
        id = "import:" + crypto.randomUUID();
      setImports((old) => [...old, { id, build, fileName: file.name }]);
      if (side === 0) setLeftSelection(id);
      else setRightSelection(id);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid build; current selections kept");
    }
  }
  function inspect(text: string) {
    try {
      if (!data.snapshot) throw new Error("Game data unavailable");
      saveItemTransfer(prepareItemTransfer(text, data.snapshot));
      router.push("/inspect");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Cannot inspect item");
    }
  }
  function entry(e: ComparisonEntry, status: string, section: string, key: number) {
    const weapon = Number(e.weapon_set ?? 0);
    const label = String(e.id ?? e.unique_name ?? e.inventory_id ?? "Entry");
    return (
      <div
        className={styles.entry}
        key={key}
        data-testid={section === "passive" ? `comparison-passive-${status}` : undefined}
      >
        <strong>
          {status === "added"
            ? "◇ Added"
            : status === "removed"
              ? "□ Removed"
              : status === "changed"
                ? "Changed"
                : "Unchanged"}{" "}
          · {label}
        </strong>
        {section === "passive" && (
          <p className={weapon === 1 ? styles.set1 : weapon === 2 ? styles.set2 : styles.shared}>
            {weapon === 1 ? "Weapon set I" : weapon === 2 ? "Weapon set II" : "Shared"}
          </p>
        )}
        {e.level_interval !== undefined && (
          <p>
            Level interval:{" "}
            {Array.isArray(e.level_interval)
              ? e.level_interval.join("–")
              : String(e.level_interval)}
          </p>
        )}
        {typeof e.additional_text === "string" && (
          <p className={styles.facts}>{e.additional_text}</p>
        )}
        {Array.isArray(e.support_skills) && (
          <p>
            Supports: {e.support_skills.map((s) => (typeof s === "string" ? s : s.id)).join(" · ")}
          </p>
        )}
        {section === "inventory" && (
          <>
            <p>
              Slot {String(e.inventory_id)} · coordinates {String(e.slot_x ?? "unavailable")},{" "}
              {String(e.slot_y ?? "unavailable")}. Full item rolls/base unavailable unless supplied
              in the notes.
            </p>
            {typeof e.additional_text === "string" && /Rarity:/m.test(e.additional_text) && (
              <Button variant="secondary" onClick={() => inspect(String(e.additional_text))}>
                Inspect available item text
              </Button>
            )}
          </>
        )}
      </div>
    );
  }
  function section(title: string, kind: string, changes: SectionDifference) {
    return (
      <section className={`panel ${styles.panel} ${styles.section}`} key={kind}>
        <SectionHeader title={title} />
        <p>
          {changes.added.length} added · {changes.removed.length} removed · {changes.changed.length}{" "}
          changed · {changes.unchanged.length} unchanged
        </p>
        {changes.added.map((e, i) => entry(e, "added", kind, i))}
        {changes.removed.map((e, i) => (
          <div key={`removed-${i}`}>{entry(e, "removed", kind, i)}</div>
        ))}
        {changes.changed.map((c, i) => (
          <div key={`changed-${i}`}>
            <p>Before</p>
            {entry(c.before, "changed", kind, i)}
            <p>After</p>
            {entry(c.after, "changed", kind, i)}
          </div>
        ))}
        {!differencesOnly &&
          changes.unchanged.map((e, i) => (
            <div key={`unchanged-${i}`}>{entry(e, "unchanged", kind, i)}</div>
          ))}
      </section>
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="TOOLS / BUILD COMPARISON"
        title="See what changed between your plans."
        description="Compare saved builds or imported copies. Weapon-set membership, notes and unresolved facts remain distinct."
      />
      {message && <Notice error>{message}</Notice>}
      <div className={styles.inputs}>
        {([0, 1] as const).map((side) => {
          const selectedId = side === 0 ? leftId : rightId,
            input = side === 0 ? left : right,
            label = side === 0 ? "Left build" : "Right build";
          return (
            <section className={`panel ${styles.panel}`} key={side}>
              <SectionHeader title={label} />
              <Field label={label}>
                <select
                  aria-label={label}
                  value={selectedId}
                  onChange={(e) =>
                    side === 0
                      ? setLeftSelection(e.target.value)
                      : setRightSelection(e.target.value)
                  }
                >
                  <option value="">Choose a build</option>
                  {inputs.map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.build.name}
                      {b.fileName !== "saved" ? " · imported copy" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Import ${side === 0 ? "left" : "right"} build`}>
                <input
                  type="file"
                  accept=".build,.json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importFile(f, side);
                    e.target.value = "";
                  }}
                />
              </Field>
              {selectedId && !input && (
                <Notice error>
                  Selected build was deleted or is unavailable. Choose another build.
                </Notice>
              )}
              {input && (
                <>
                  <p>
                    {input.build.name} · {input.build.ascendancy ?? "Ascendancy unavailable"}
                  </p>
                  {input.fileName !== "saved" && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const id = store.saveBuild(structuredClone(input.build));
                        if (side === 0) setLeftSelection(id);
                        else setRightSelection(id);
                      }}
                    >
                      Save imported copy to library
                    </Button>
                  )}
                  <p className="fine-print">
                    Stable input ID: {input.id}
                    {store.builds.find((b) => b.id === input.id)?.updatedAt &&
                      ` · updated ${store.builds.find((b) => b.id === input.id)!.updatedAt}`}
                  </p>
                </>
              )}
            </section>
          );
        })}
      </div>
      {diff && left && right && (
        <>
          <div className="button-group">
            <label>
              <input
                type="checkbox"
                aria-label="Differences only"
                checked={differencesOnly}
                onChange={(e) => setDifferencesOnly(e.target.checked)}
              />
              Differences only
            </label>
            <Button
              onClick={() =>
                downloadFile(
                  "build-comparison.json",
                  JSON.stringify(report, null, 2),
                  "application/json",
                )
              }
            >
              Download comparison report
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(JSON.stringify(report, null, 2))
                  .catch(() => setMessage("Clipboard unavailable; download the report."))
              }
            >
              Copy comparison report
            </Button>
          </div>
          <p>
            {diff.hasChanges ? "Differences found" : "These builds compare equal"}. Left:{" "}
            {diff.counts.left.regular ?? "unavailable"} regular /{" "}
            {diff.counts.left.ascendancy ?? "unavailable"} ascendancy; right:{" "}
            {diff.counts.right.regular ?? "unavailable"} regular /{" "}
            {diff.counts.right.ascendancy ?? "unavailable"} ascendancy.{" "}
            {(diff.counts.left.knownOnly || diff.counts.right.knownOnly) &&
              "Counts cover known valid nodes only."}
          </p>
          {diff.unresolved.length > 0 && (
            <Notice error>
              Unresolved data:
              {diff.unresolved.map((id, i) => (
                <p key={i}>{id}</p>
              ))}
            </Notice>
          )}
          {diff.metadata.length > 0 && (
            <section className={`panel ${styles.panel} ${styles.section}`}>
              <SectionHeader title="Build details" />
              {diff.metadata.map((m) => (
                <div className={styles.entry} key={m.field}>
                  <strong>{m.field}</strong>
                  <p className={styles.facts}>Before: {String(m.before ?? "unavailable")}</p>
                  <p className={styles.facts}>After: {String(m.after ?? "unavailable")}</p>
                </div>
              ))}
            </section>
          )}
          {query.data && (
            <>
              <p className="fine-print">
                Declared tree: {query.data.source ?? "GGG export"} · revision{" "}
                {query.data.revision ?? "version unrecorded"}. ◇ Added on the right · □ Removed on
                the left. Node colors identify shared / weapon sets.
              </p>
              <div className={styles.trees}>
                {[left, right].map((input, index) => {
                  const display = buildComparisonDisplay(input.build, query.data!);
                  const additions = diff.passives.added.map((e) => String(e.id)),
                    removals = diff.passives.removed.map((e) => String(e.id));
                  return (
                    <section className={`panel ${styles.panel}`} key={index}>
                      <h3>
                        {index === 0 ? "Before" : "After"} · {input.build.name}
                      </h3>
                      <TreeCanvas
                        tree={query.data!}
                        allocated={[
                          ...display.plan.shared,
                          ...display.plan.weapon1,
                          ...display.plan.weapon2,
                        ]}
                        display={{ ...display.plan, mode, showBoth: both }}
                        onModeChange={setMode}
                        onShowBothChange={setBoth}
                        onSelect={setSelected}
                        highlight={selected}
                        readOnly
                        difference={{
                          added:
                            index === 1
                              ? query
                                  .data!.nodes.filter((n) => additions.includes(n.id))
                                  .map((n) => n.hash)
                              : [],
                          removed:
                            index === 0
                              ? query
                                  .data!.nodes.filter((n) => removals.includes(n.id))
                                  .map((n) => n.hash)
                              : [],
                        }}
                      />
                      {selected && (
                        <p>
                          {query.data!.nodes.find((n) => n.hash === selected)?.name ?? selected} ·{" "}
                          {query.data!.nodes.find((n) => n.hash === selected)?.stats.join(" · ")}
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {query.error && (
            <Notice error>Tree overlay unavailable; all differences remain listed below.</Notice>
          )}
          {section("Passive allocations", "passive", diff.passives)}
          {section("Skills & supports", "skill", diff.skills)}
          {section("Inventory hints", "inventory", diff.inventory)}
          <p className="fine-print">
            Comparison uses available build facts. Combat statistics and full equipment rolls are
            unavailable in the current build format.
          </p>
        </>
      )}
    </>
  );
}
