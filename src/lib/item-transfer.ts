import { parseItemText } from "./item-text";
import { templateMatcher, type GameSnapshot } from "./game-data";
import { buildRegexCatalogue } from "./regex-catalogue-builder";
import { createRegexDraft, type RegexDraft } from "./regex-schema";
export type ItemTransfer = {
  version: 1;
  itemText: string;
  snapshotId: string;
  draft: RegexDraft;
  recognizedSelections: RegexDraft["wanted"];
  unresolved: string[];
  complete: boolean;
};
export function prepareItemTransfer(itemText: string, snapshot: GameSnapshot): ItemTransfer {
  const item = parseItemText(itemText),
    catalogue = buildRegexCatalogue(snapshot);
  const category = item.itemClass?.toLowerCase().includes("waystone")
    ? "waystone"
    : item.itemClass?.toLowerCase().includes("tablet")
      ? "tablet"
      : item.itemClass?.toLowerCase().includes("relic")
        ? "relic"
        : "equipment";
  const draft = createRegexDraft(category);
  draft.match = "all";
  draft.snapshotId = snapshot.id;
  const unresolved: string[] = [];
  for (const line of item.modifiers) {
    const definitions = catalogue.modifiers.filter(
      (m) =>
        m.categories.includes(category) &&
        !m.template.includes("\n") &&
        templateMatcher(m.template).test(line.text),
    );
    const m = definitions.find((m) => m.numericSlots) || definitions[0];
    if (!m) {
      unresolved.push(line.originalText);
      continue;
    }
    if (line.actualRolls.length && !m.numericDomain) {
      unresolved.push(`${line.originalText}: numeric semantics unavailable`);
      continue;
    }
    draft.wanted.push({
      id: m.id,
      min: line.actualRolls.length ? String(line.actualRolls[0]) : "",
      max: line.actualRolls.length ? String(line.actualRolls[0]) : "",
      slots:
        line.actualRolls.length > 1
          ? Object.fromEntries(
              line.actualRolls
                .slice(1)
                .map((n, i) => [String(i + 1), { min: String(n), max: String(n) }]),
            )
          : undefined,
    });
  }
  if (item.rarity) draft.properties.rarity = item.rarity.toLowerCase();
  if (item.corrupted) draft.properties.corrupted = "true";
  if (item.base) draft.properties.base = item.base;
  const headers: Record<string, string> = {
    quality: "quality",
    itemRarity: "iir",
    waystoneTier: "tier",
    attackRate: "attack-rate",
    sockets: "sockets",
  };
  for (const [key, value] of Object.entries(item.properties)) {
    const id = headers[key];
    if (id && catalogue.properties.find((p) => p.id === id && p.categories.includes(category)))
      draft.properties[id] = {
        min: String(value),
        max: String(value),
      };
    else unresolved.push(`${key}: ${value} (search property unavailable)`);
  }
  if (item.requiredLevel !== undefined) {
    if (
      catalogue.properties.some((p) => p.id === "required-level" && p.categories.includes(category))
    )
      draft.properties["required-level"] = {
        min: String(item.requiredLevel),
        max: String(item.requiredLevel),
      };
    else unresolved.push(`Required level: ${item.requiredLevel} (search property unavailable)`);
  }
  for (const [key, value] of Object.entries(item.requirements))
    if (key !== "Level")
      unresolved.push(`Requirement ${key}: ${value} (search property unavailable)`);
  if (item.itemLevel !== undefined && category === "equipment")
    draft.properties["item-level"] = { min: String(item.itemLevel), max: String(item.itemLevel) };
  return {
    version: 1,
    itemText,
    snapshotId: snapshot.id,
    draft,
    recognizedSelections: draft.wanted,
    unresolved,
    complete: !unresolved.length,
  };
}
export function saveItemTransfer(transfer: ItemTransfer) {
  sessionStorage.setItem("exile-atlas-item-transfer-v1", JSON.stringify(transfer));
}
export function readItemTransfer(): ItemTransfer | undefined {
  const raw = sessionStorage.getItem("exile-atlas-item-transfer-v1");
  if (!raw) return;
  const value = JSON.parse(raw);
  if (
    value.version !== 1 ||
    typeof value.itemText !== "string" ||
    new TextEncoder().encode(value.itemText).length > 65536
  )
    throw new Error("Invalid item transfer");
  return value;
}
