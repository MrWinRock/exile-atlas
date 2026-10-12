import {expect,test} from "bun:test";
import {buildRegexCatalogue} from "../src/lib/regex-catalogue-builder";
import {validateGameSnapshot} from "../src/lib/game-data";
import {compileRegexSearch} from "../src/lib/regex-search";
import {createRegexDraft} from "../src/lib/regex-schema";
import {prepareRegexTrade} from "../src/lib/regex-trade";
test("active catalogue preserves old IDs while exposing sourced item families and class controls",async()=>{
 const catalogue=buildRegexCatalogue(validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json()));expect(catalogue.modifiers.find(m=>m.id==="chilled-ground")).toBeDefined();expect(catalogue.modifiers.some(m=>m.template==="+# to Level of all Fire Spell Skills")).toBe(true);expect(catalogue.properties.some(p=>p.id==="item-class")).toBe(true);
 const draft=createRegexDraft("equipment");const mod=catalogue.modifiers.find(m=>m.template==="Adds # to # Fire Damage")!;draft.wanted=[{id:mod.id,min:"5",max:"",slots:{"1":{min:"",max:"10"}}}];const compiled=compileRegexSearch(draft,catalogue);expect(compiled.valid).toBe(true);expect(new RegExp(compiled.groups[0].conditions[0].pattern,"im").test("Adds 5 to 11 Fire Damage")).toBe(false);
});
test("recorded reference families all have independent sourced identities and lossy roll trade transfer is blocked",async()=>{
 const inventory=await Bun.file("public/data/poe2-regex-coverage.json").json();expect(inventory.categories.Tablet.matched).toBe(86);expect(inventory.categories.Relic.matched).toBe(31);expect(inventory.categories.Item.matched).toBe(513);
 const catalogue=buildRegexCatalogue(validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json()));const draft=createRegexDraft("equipment");const mod=catalogue.modifiers.find(m=>m.template==="Adds # to # Fire Damage")!;draft.wanted=[{id:mod.id,min:"5",max:"",slots:{"1":{min:"",max:"10"}}}];expect(prepareRegexTrade(draft,"Standard",catalogue).ready).toBe(false);
});
