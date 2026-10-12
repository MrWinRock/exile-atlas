import { REGEX_PROPERTIES } from "./regex-catalogue";
import { compileRegexSearch, escapeRegexLiteral, type SearchCondition } from "./regex-search";
import type { RegexDraft } from "./regex-schema";
import type {RegexCatalogue} from "./regex-catalogue-builder";
import {parseItemText} from "./item-text";
export type RegexItemTestResult = {
  status: "match" | "no-match" | "incomplete" | "invalid";
  conditions: { key: string; label: string; status: "pass" | "fail" | "unknown" }[];
  errors: string[];
};
export function testRegexItem(draft: RegexDraft, text: string,catalogue?:RegexCatalogue): RegexItemTestResult {
  const compiled = compileRegexSearch(draft,catalogue);
  if (new TextEncoder().encode(text).length > 65536)
    return { status: "invalid", conditions: [], errors: ["Item text must be at most 64 KiB."] };
  if (!compiled.valid) return { status: "invalid", conditions: [], errors: compiled.errors };
  if (!compiled.groups.length || !text.trim())
    return {
      status: "incomplete",
      conditions: [],
      errors: ["Configure a search and paste item text first."],
    };
  const parsed=parseItemText(text);const modifierLines=new Map(parsed.modifiers.map(m=>[m.line,m.text]));
  const normalized = parsed.lines.map(l=>modifierLines.get(l.line)??l.text).join("\n");
  const evaluate = (c: SearchCondition): "pass" | "fail" | "unknown" => {
    if (c.source === "property") {
      let known = false;
      if (c.propertyId === "rarity" || c.propertyId === "corrupted" || c.propertyId === "delirious")
        known = /^Rarity: *\w+/im.test(normalized);
      else {
        const p = (catalogue?.properties??REGEX_PROPERTIES).find((p) => p.id === c.propertyId);
        known = !!p?.templates?.some((t) =>
          new RegExp(t.split("#").map(escapeRegexLiteral).join("[+-]?[0-9]+"), "im").test(
            normalized,
          ),
        );
      }
      if(c.propertyId==="item-class")known=!!parsed.itemClass;
      if(c.propertyId==="verified-base")known=!!parsed.base;
      if (!known) return "unknown";
    }
    const matches = new RegExp(c.pattern, "im").test(normalized);
    return (c.negative ? !matches : matches) ? "pass" : "fail";
  };
  const conditions: RegexItemTestResult["conditions"] = [];
  const groupResults = compiled.groups.map((g) => {
    const statuses = g.conditions.map((c) => {
      const status = evaluate(c);
      conditions.push({ key: c.key, label: c.label, status });
      return status;
    });
    if (g.operator === "any")
      return statuses.includes("pass") ? "pass" : statuses.includes("unknown") ? "unknown" : "fail";
    return statuses.includes("fail") ? "fail" : statuses.includes("unknown") ? "unknown" : "pass";
  });
  return {
    status: groupResults.includes("fail")
      ? "no-match"
      : groupResults.includes("unknown")
        ? "incomplete"
        : "match",
    conditions,
    errors: [],
  };
}
