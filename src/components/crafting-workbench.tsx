"use client";
import { useEffect, useMemo, useState } from "react";
import { useGameData } from "@/lib/game-data-store";
import { useCraftingRecipes } from "@/lib/crafting-store";
import {
  createCraftRecipe,
  eligibleModifiers,
  checkCraftStep,
  type CraftRecipe,
  type CraftStep,
} from "@/lib/crafting";
import { summarizeCraftBudget } from "@/lib/crafting-budget";
import { CORE_CRAFT_OPERATIONS } from "@/lib/crafting-operations";
import { parseItemText } from "@/lib/item-text";
import { useItemTransfer, clearItemTransfer } from "@/lib/item-transfer-hook";
import { useGenesisWorkspace } from "@/lib/genesis-store";
import { downloadFile } from "@/lib/build";
import { api } from "@/lib/client";
import { compareExchangePair, type Market } from "@/lib/currency";
import { Button, Field, Notice, PageTitle, SectionHeader } from "./ui";
import styles from "./crafting-workbench.module.css";
export function CraftingWorkbench() {
  const library = useCraftingRecipes(),
    data = useGameData(),
    genesis = useGenesisWorkspace(),
    { transfer, error: transferError } = useItemTransfer();
  const [recipe, setRecipe] = useState<CraftRecipe>(createCraftRecipe),
    [search, setSearch] = useState(""),
    [affix, setAffix] = useState(""),
    [tag, setTag] = useState(""),
    [group, setGroup] = useState(""),
    [showUnknown, setShowUnknown] = useState(true),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [deletePending, setDeletePending] = useState(false);
  useEffect(() => useCraftingRecipes.getState().load(), []);
  const operations = data.snapshot?.currencyOperations.length
    ? data.snapshot.currencyOperations
    : CORE_CRAFT_OPERATIONS;
  const pool = useMemo(
    () => (data.snapshot ? eligibleModifiers(recipe.baseId, recipe.itemLevel, data.snapshot) : []),
    [data.snapshot, recipe.baseId, recipe.itemLevel],
  );
  const options = pool.filter(
    (p) =>
      p.status !== "ineligible" &&
      (showUnknown || p.status === "eligible") &&
      (!affix || p.modifier.affixType === affix) &&
      (!tag || p.modifier.tags.some((t) => t.includes(tag))) &&
      (!group || p.modifier.group?.toLowerCase().includes(group.toLowerCase())) &&
      `${p.modifier.name ?? ""} ${p.modifier.templates.join(" ")} ${p.modifier.group ?? ""} ${p.modifier.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const budget = useMemo(() => {
    try {
      return { summary: summarizeCraftBudget(recipe, []), error: "" };
    } catch (e) {
      return { summary: undefined, error: e instanceof Error ? e.message : "Invalid budget" };
    }
  }, [recipe]);
  const parsed = useMemo(() => {
    try {
      return recipe.startingItemText ? parseItemText(recipe.startingItemText) : undefined;
    } catch {
      return undefined;
    }
  }, [recipe.startingItemText]);
  function update(patch: Partial<CraftRecipe>) {
    setRecipe((r) => ({ ...r, ...patch }));
  }
  function attempt(task: () => void) {
    try {
      task();
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Recipe action failed");
    }
  }
  function addStep(actual = false) {
    const step: CraftStep = {
      id: crypto.randomUUID(),
      currency: operations.find((o) => o.name === "Exalted Orb")!.id,
      quantity: "1",
      unitCost: "",
      quoteCurrency: recipe.quoteCurrency,
      costSource: "unpriced",
      notes: "",
    };
    update(
      actual ? { actualSpend: [...recipe.actualSpend, step] } : { steps: [...recipe.steps, step] },
    );
  }
  function editStep(id: string, patch: Partial<CraftStep>, actual = false) {
    const key = actual ? "actualSpend" : "steps";
    update({
      [key]: recipe[key].map((s) => {
        if (s.id !== id) return s;
        const currencyChanged = patch.currency !== undefined && patch.currency !== s.currency;
        return {
          ...s,
          ...patch,
          ...(currencyChanged
            ? {
                unitCost: "",
                costSource: "unpriced" as const,
                league: undefined,
                quotedAt: undefined,
                rateLow: undefined,
                rateHigh: undefined,
              }
            : {}),
        };
      }),
    });
  }
  function readStart(text: string) {
    const item = parseItemText(text);
    const base = data.snapshot?.bases.filter((b) => b.name === item.base || b.name === item.name);
    update({
      startingItemText: text,
      baseId: base?.length === 1 ? base[0].id : "",
      itemLevel: item.itemLevel,
    });
  }
  async function fillPrices() {
    setBusy(true);
    try {
      if (!recipe.league.trim()) throw new Error("Enter a league for completed-hour quotes");
      const snapshot = await api<{ hour: number; markets: Market[] }>("currency");
      const ids = [...new Set(snapshot.markets.flatMap((m) => [m.baseId, m.quoteId]))];
      const aliases: Record<string, string> = {
        "Divine Orb": "CurrencyModValues",
        "Exalted Orb": "CurrencyAddModToRare",
        "Chaos Orb": "CurrencyRerollRare",
      };
      const quoteKey = aliases[recipe.quoteCurrency] ?? recipe.quoteCurrency;
      const quoteId = ids.find((id) => id === quoteKey || id.split("/").at(-1) === quoteKey);
      if (!quoteId) throw new Error("Quote currency unavailable in this completed hour");
      let filled = 0;
      const steps = recipe.steps.map((s) => {
        if (s.unitCost?.trim()) return s;
        const baseId = ids.find(
          (id) => id === s.currency || id.split("/").at(-1) === s.currency.split("/").at(-1),
        );
        if (!baseId) return s;
        const pair = compareExchangePair(snapshot.markets, baseId, quoteId, recipe.league);
        if (!pair?.complete || pair.low === null || pair.high === null) return s;
        filled++;
        return {
          ...s,
          unitCost: ((pair.low + pair.high) / 2).toFixed(6),
          quoteCurrency: recipe.quoteCurrency,
          costSource: "market" as const,
          league: recipe.league,
          quotedAt: new Date(snapshot.hour * 1000).toISOString(),
          rateLow: String(pair.low),
          rateHigh: String(pair.high),
        };
      });
      update({ steps });
      setMessage(
        `Filled ${filled} missing costs from the completed-hour midpoint, rounded to six decimals. Manual costs were preserved.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Quotes unavailable");
    } finally {
      setBusy(false);
    }
  }
  const selected = recipe.targets.map((id) => pool.find((p) => p.modifier.id === id));
  const groups = new Map<string, number>();
  selected.forEach((p) => {
    if (p?.modifier.group) groups.set(p.modifier.group, (groups.get(p.modifier.group) ?? 0) + 1);
  });
  const conflicts = [...groups].filter(([, n]) => n > 1).map(([g]) => g);
  function renderSteps(steps: CraftStep[], actual = false) {
    return steps.map((s, i) => {
      const op = operations.find((o) => o.id === s.currency);
      const check =
        parsed && op && data.snapshot ? checkCraftStep(parsed, op, data.snapshot) : undefined;
      return (
        <div className={styles.step} key={s.id}>
          <h3>
            {actual ? "Spend" : "Step"} {i + 1}
          </h3>
          <Field label={`${actual ? "Spend" : "Step"} ${i + 1} action`}>
            <select
              value={op ? s.currency : "manual"}
              onChange={(e) =>
                editStep(
                  s.id,
                  { currency: e.target.value === "manual" ? "Manual action" : e.target.value },
                  actual,
                )
              }
            >
              {operations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              <option value="manual">Manual action / other currency</option>
            </select>
          </Field>
          {!op && (
            <Field label={`${actual ? "Spend" : "Step"} ${i + 1} manual action`}>
              <input
                value={s.currency}
                onChange={(e) => editStep(s.id, { currency: e.target.value }, actual)}
              />
            </Field>
          )}
          <div className={styles.row}>
            <Field label={`${actual ? "Spend" : "Step"} ${i + 1} quantity`}>
              <input
                aria-label={`${actual ? "Spend" : "Step"} ${i + 1} quantity`}
                inputMode="decimal"
                value={s.quantity}
                onChange={(e) => editStep(s.id, { quantity: e.target.value }, actual)}
              />
            </Field>
            <Field label={`${actual ? "Spend" : "Step"} ${i + 1} unit cost`}>
              <input
                aria-label={`${actual ? "Spend" : "Step"} ${i + 1} unit cost`}
                inputMode="decimal"
                value={s.unitCost ?? ""}
                onChange={(e) =>
                  editStep(s.id, { unitCost: e.target.value, costSource: "manual" }, actual)
                }
                placeholder="Unpriced"
              />
            </Field>
            <Field label={`${actual ? "Spend" : "Step"} ${i + 1} quote currency`}>
              <input
                value={s.quoteCurrency}
                onChange={(e) =>
                  editStep(s.id, { quoteCurrency: e.target.value, costSource: "manual" }, actual)
                }
              />
            </Field>
          </div>
          {op && (
            <p>
              <a href={op.source} target="_blank" rel="noreferrer">
                Sourced effect
              </a>
              : {op.effect} Requires {op.rarities.join(" / ")} rarity.{" "}
              {check
                ? `${check.status}: ${check.reasons.join(" · ")}`
                : "Starting-item preconditions unavailable."}
            </p>
          )}
          <p>
            {s.costSource === "market"
              ? `Historical midpoint estimate · ${s.league} · ${s.quotedAt} · bounds ${s.rateLow}–${s.rateHigh}`
              : s.unitCost?.trim()
                ? "Manually entered unit cost"
                : "Unpriced; not included as zero"}
          </p>
          <Field label={`${actual ? "Spend" : "Step"} ${i + 1} notes`}>
            <input
              value={s.notes}
              onChange={(e) => editStep(s.id, { notes: e.target.value }, actual)}
            />
          </Field>
          <div className="button-group">
            {!actual && (
              <>
                <Button
                  variant="ghost"
                  disabled={i === 0}
                  onClick={() => {
                    const moved = [...steps];
                    [moved[i - 1], moved[i]] = [moved[i], moved[i - 1]];
                    update({ steps: moved });
                  }}
                >
                  Move step {i + 1} up
                </Button>
                <Button
                  variant="ghost"
                  disabled={i === steps.length - 1}
                  onClick={() => {
                    const moved = [...steps];
                    [moved[i + 1], moved[i]] = [moved[i], moved[i + 1]];
                    update({ steps: moved });
                  }}
                >
                  Move step {i + 1} down
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() =>
                update({
                  [actual ? "actualSpend" : "steps"]: [
                    ...steps,
                    { ...structuredClone(s), id: crypto.randomUUID() },
                  ],
                })
              }
            >
              Duplicate {actual ? "spend" : "step"} {i + 1}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                update({ [actual ? "actualSpend" : "steps"]: steps.filter((r) => r.id !== s.id) })
              }
            >
              Remove {actual ? "spend" : "step"} {i + 1}
            </Button>
          </div>
        </div>
      );
    });
  }
  return (
    <>
      <PageTitle
        eyebrow="TOOLS / CRAFTING WORKBENCH"
        title="Plan the craft. Keep the budget."
        description="Browse a verified modifier pool and save ordered crafting recipes with costs, notes and actual spend."
      />
      {(message || library.warning || data.error || transferError) && (
        <Notice error>{message || library.warning || data.error || transferError}</Notice>
      )}
      <div className={styles.grid}>
        <section className={`panel ${styles.panel}`}>
          <SectionHeader title="Recipe & starting item" />
          <Field label="Saved recipe">
            <select
              aria-label="Saved recipe"
              value={library.records.some((r) => r.id === recipe.id) ? recipe.id : ""}
              onChange={(e) => {
                const r = library.records.find((r) => r.id === e.target.value);
                if (r) setRecipe(structuredClone(r));
              }}
            >
              <option value="">Unsaved recipe</option>
              {library.records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.favorite ? "★ " : ""}
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recipe name">
            <input
              aria-label="Recipe name"
              value={recipe.name}
              maxLength={120}
              onChange={(e) => update({ name: e.target.value })}
            />
          </Field>
          <label>
            <input
              type="checkbox"
              checked={recipe.favorite}
              onChange={(e) => update({ favorite: e.target.checked })}
            />
            Favorite
          </label>
          <div className="button-group">
            <Button
              onClick={() =>
                attempt(() =>
                  library.save({ ...recipe, snapshotId: recipe.snapshotId ?? data.snapshot?.id }),
                )
              }
            >
              Save recipe
            </Button>
            <Button variant="secondary" onClick={() => setRecipe(createCraftRecipe())}>
              New recipe
            </Button>
            <Button
              variant="ghost"
              disabled={!library.records.some((r) => r.id === recipe.id)}
              onClick={() => attempt(() => library.duplicate(recipe.id))}
            >
              Duplicate recipe
            </Button>
            <Button
              variant="ghost"
              disabled={!library.records.some((r) => r.id === recipe.id)}
              onClick={() => setDeletePending(true)}
            >
              Delete recipe
            </Button>
            {deletePending && (
              <Button
                onClick={() => {
                  attempt(() => library.remove(recipe.id));
                  setDeletePending(false);
                  setRecipe(createCraftRecipe());
                }}
              >
                Confirm recipe deletion
              </Button>
            )}
          </div>
          {transfer && (
            <Notice>
              Review the inspector transfer before replacing your starting item.{" "}
              <Button
                variant="secondary"
                onClick={() =>
                  attempt(() => {
                    readStart(transfer.itemText);
                    clearItemTransfer();
                  })
                }
              >
                Use transferred item
              </Button>
              <Button variant="ghost" onClick={clearItemTransfer}>
                Discard transfer
              </Button>
            </Notice>
          )}
          <Field label="Starting item text">
            <textarea
              aria-label="Starting item text"
              value={recipe.startingItemText ?? ""}
              onChange={(e) => update({ startingItemText: e.target.value })}
            />
          </Field>
          <Button
            variant="secondary"
            disabled={!recipe.startingItemText}
            onClick={() => attempt(() => readStart(recipe.startingItemText!))}
          >
            Read starting item
          </Button>
          <div className={styles.row}>
            <Field label="Starting base">
              <select
                aria-label="Starting base"
                value={recipe.baseId}
                onChange={(e) => update({ baseId: e.target.value })}
              >
                <option value="">Unknown / choose a base</option>
                {data.snapshot?.bases.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Item level">
              <input
                aria-label="Item level"
                type="number"
                min={1}
                max={100}
                value={recipe.itemLevel ?? ""}
                onChange={(e) =>
                  update({ itemLevel: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>
          </div>
          <SectionHeader title="Applicable modifier pool" />
          <div className={styles.row}>
            <Field label="Search modifier pool">
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            <Field label="Affix type">
              <select value={affix} onChange={(e) => setAffix(e.target.value)}>
                <option value="">All affix types</option>
                <option>Prefix</option>
                <option>Suffix</option>
              </select>
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Modifier group">
              <input value={group} onChange={(e) => setGroup(e.target.value)} />
            </Field>
            <Field label="Modifier tag">
              <input value={tag} onChange={(e) => setTag(e.target.value)} />
            </Field>
          </div>
          <label>
            <input
              type="checkbox"
              checked={showUnknown}
              onChange={(e) => setShowUnknown(e.target.checked)}
            />
            Show uncertain eligibility
          </label>
          <p className="fine-print">
            {options.length} matches. Search to narrow the first 120. Required modifier level and
            roll ranges are sourced; unverified tier numbers are not inferred.
          </p>
          <div className={styles.pool}>
            {options.slice(0, 120).map((p) => (
              <label className={styles.modifier} key={p.modifier.id}>
                <input
                  type="checkbox"
                  checked={recipe.targets.includes(p.modifier.id)}
                  onChange={(e) =>
                    update({
                      targets: e.target.checked
                        ? [...recipe.targets, p.modifier.id]
                        : recipe.targets.filter((id) => id !== p.modifier.id),
                    })
                  }
                />
                {p.modifier.templates.join(" · ")}
                <small>
                  {p.status} · {p.modifier.affixType ?? "affix type unknown"} · modifier level{" "}
                  {p.modifier.requiredLevel ?? "unknown"} · {p.modifier.group ?? "group unknown"}
                </small>
                <small>
                  {p.modifier.numericSlots.map((s) => s.domain.join("–")).join(" / ")} · {p.reason}
                </small>
              </label>
            ))}
          </div>
          {selected.map((p, i) => (
            <div className={styles.target} key={recipe.targets[i]}>
              Target: {p ? p.modifier.templates.join(" · ") : recipe.targets[i] + " · unresolved"}
            </div>
          ))}
          {conflicts.length > 0 && (
            <Notice error>
              Targets share modifier groups: {conflicts.join(", ")}. Review these as alternatives;
              ordinary affixes in the same group cannot coexist.
            </Notice>
          )}
          <p className="fine-print">
            Source {recipe.snapshotId?.slice(0, 12) ?? "version unrecorded"}.{" "}
            {data.snapshot && recipe.snapshotId !== data.snapshot.id && (
              <Button variant="ghost" onClick={() => update({ snapshotId: data.snapshot!.id })}>
                Revalidate recipe
              </Button>
            )}
          </p>
          <Field label="Genesis reference">
            <select
              value={recipe.genesisPlanId ?? ""}
              onChange={(e) => {
                const p = genesis.plans.find((p) => p.id === e.target.value);
                update({
                  genesisPlanId: p?.id,
                  genesisLabel: p ? `${p.name} · historical dataset ${p.plan.dataset}` : undefined,
                });
              }}
            >
              <option value="">No Genesis reference</option>
              {genesis.plans.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          {recipe.genesisPlanId && (
            <p>
              {recipe.genesisLabel}
              {!genesis.plans.some((p) => p.id === recipe.genesisPlanId) &&
                " · saved plan unavailable"}
              . Reference only; no choices are simulated.
            </p>
          )}
          <Field label="Recipe notes">
            <textarea
              aria-label="Recipe notes"
              value={recipe.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </Field>
          <div className="button-group">
            <Button
              variant="secondary"
              onClick={() =>
                attempt(() =>
                  downloadFile("crafting-recipes.json", library.exportJson(), "application/json"),
                )
              }
            >
              Export recipes
            </Button>
            <Field label="Import recipes">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void f
                      .text()
                      .then((t) => attempt(() => library.importJson(t)))
                      .catch(() => setMessage("Could not read recipe file"));
                  e.target.value = "";
                }}
              />
            </Field>
          </div>
        </section>
        <section className={`panel ${styles.panel}`}>
          <SectionHeader title="Steps & cost budget" />
          <div className={styles.row}>
            <Field label="Budget quote currency">
              <input
                value={recipe.quoteCurrency}
                onChange={(e) => update({ quoteCurrency: e.target.value })}
              />
            </Field>
            <Field label="Budget amount">
              <input
                inputMode="decimal"
                value={recipe.budget ?? ""}
                onChange={(e) => update({ budget: e.target.value })}
              />
            </Field>
            <Field label="Quote league">
              <input value={recipe.league} onChange={(e) => update({ league: e.target.value })} />
            </Field>
          </div>
          <Button variant="secondary" disabled={busy} onClick={() => void fillPrices()}>
            Fill missing completed-hour costs
          </Button>
          <p className="fine-print">
            Price defaults are historical exchange midpoints, rounded to six decimals. Steps retain
            their quote currency, league and timestamp. Missing prices stay unpriced.
          </p>
          {budget.error && <Notice error>{budget.error}</Notice>}
          {budget.summary && (
            <div className={styles.budget}>
              <strong data-testid="craft-subtotal">
                {budget.summary.pricedSubtotal} {recipe.quoteCurrency}
              </strong>
              <p>
                {budget.summary.complete
                  ? "Complete priced budget"
                  : "Priced subtotal · incomplete budget"}
              </p>
              {Object.entries(budget.summary.rawTotals).map(([currency, n]) => (
                <p key={currency}>
                  Raw: {n} {operations.find((o) => o.id === currency)?.name ?? currency}
                </p>
              ))}
              {Object.entries(budget.summary.pricedTotals)
                .filter(([c]) => c !== recipe.quoteCurrency)
                .map(([c, n]) => (
                  <p key={c}>
                    Separate priced total: {n} {c}
                  </p>
                ))}
              <p>Unpriced steps: {budget.summary.unpriced.length}</p>
              <p>
                Actual priced spend: {budget.summary.actual.pricedSubtotal} {recipe.quoteCurrency}{" "}
                {budget.summary.actual.complete ? "" : "· incomplete"}
              </p>
              {budget.summary.remainingBudget !== undefined && (
                <p>
                  Remaining budget: {budget.summary.remainingBudget} {recipe.quoteCurrency}
                </p>
              )}
            </div>
          )}
          <p className="fine-print">
            Preconditions below refer to the pasted starting item. Random steps do not manufacture a
            resulting item; recheck the actual item as you craft.
          </p>
          {renderSteps(recipe.steps)}
          <Button variant="secondary" onClick={() => addStep()}>
            Add crafting step
          </Button>
          <SectionHeader title="Actual spend entries" />
          {renderSteps(recipe.actualSpend, true)}
          <Button variant="secondary" onClick={() => addStep(true)}>
            Add actual spend
          </Button>
        </section>
      </div>
    </>
  );
}
