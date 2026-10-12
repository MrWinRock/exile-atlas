import { expect,test } from "bun:test";
import { parseLuaLiterals } from "../src/server/game-data/lua-literals";
import { normalizePobBundle } from "../src/server/game-data/pob-adapter";
import { matchItemModifiers } from "../src/lib/game-data";
import { parseItemText } from "../src/lib/item-text";
import { validateGameSnapshot } from "../src/lib/game-data";
import { createHash } from "node:crypto";
const lua='return { ["Strength1"]={type="Suffix",affix="of the Brute","+(5-8) to Strength",level=1,group="Strength",weightKey={"ring","default"},weightVal={1,0},modTags={"attribute"},tradeHashes={[4080418644]={"+(5-8) to Strength"}}}, ["Strength8"]={type="Suffix","+(31-33) to Strength",level=74,group="Strength",weightKey={"ring","default"},weightVal={1,0}} }';
test("base assignment wrappers are extracted as literal data with whitespace variation",()=>{
 const s=normalizePobBundle({"Base-ring.lua":'return function (itemBases)\nitemBases["Gold Ring"] = {\n type="Ring", tags={ring=true,default=true},req={level=12}\n}\nend'},[{source:"PoB",revision:"b".repeat(40),url:"https://example.test",checksum:"a".repeat(64)}]);
 expect(s.bases[0].tags).toEqual(["ring","default"]);expect(s.bases[0].requiredLevel).toBe(12);
});
test("hidden duplicated upstream base variants do not become selectable equipment",()=>{
 const s=normalizePobBundle({"Base-ring.lua":'return function(itemBases)\nitemBases["Hidden"] = {\n hidden=true,type="Ring",tags={ring=true}\n}\nitemBases["Hidden"] = {\n hidden=true,type="Ring",tags={ring=true}\n}\nend'},[{source:"PoB",revision:"b".repeat(40),url:"https://example.test",checksum:"a".repeat(64)}]);expect(s.bases).toHaveLength(0);expect(s.diagnostics.length).toBe(2);
});
test("literal extraction preserves numeric keys and rejects executable and poisoned sources",()=>{
 expect(parseLuaLiterals("return {true,1.5, name='x'}")).toEqual({"1":true,"2":1.5,name:"x"});
 for(const s of ['return {x=function() end}','return {x=1,x=2}','return {["__proto__"]={}}','return os.execute("x")'])expect(()=>parseLuaLiterals(s)).toThrow();
});
test("normalizer retains ordered eligibility, bounds, groups and ambiguous matching",()=>{
 const snapshot=normalizePobBundle({"ModItem.lua":lua},[{source:"PoB",revision:"b".repeat(40),url:"https://example.test",checksum:"a".repeat(64)}]);
 const mod=snapshot.modifiers.find(m=>m.id==="ModItem:Strength1")!;expect(mod.requiredLevel).toBe(1);expect(mod.affixType).toBe("Suffix");expect(mod.numericSlots[0].domain).toEqual([5,8]);expect(mod.eligibilityRules).toEqual([{tag:"ring",value:1},{tag:"default",value:0}]);expect(mod.tradeMappings[0].id).toBe("explicit.stat_4080418644");
 const matches=matchItemModifiers(parseItemText("Rarity: Rare\nA\nGold Ring\n--------\n+6 to Strength"),snapshot);expect(matches[0].candidates[0].id).toBe("ModItem:Strength1");expect(matches[0].status).toBe("ambiguous");
});
test("bundled source-qualified snapshot validates stable IDs and reproducible content",async()=>{
 const raw=await Bun.file("public/data/poe2-game-data.json").json();const s=validateGameSnapshot(raw);expect(s.modifiers).toHaveLength(9071);expect(s.bases).toHaveLength(1440);expect(s.sourceRefs).toHaveLength(29);expect(s.modifiers.find(m=>m.id==="ModItem:Strength8")?.requiredLevel).toBe(74);
 expect(createHash("sha256").update(JSON.stringify({...s,id:undefined,verifiedAt:undefined})).digest("hex")).toBe(s.id);
 expect(()=>validateGameSnapshot({...raw,schemaVersion:2})).toThrow();expect(()=>validateGameSnapshot({...raw,bases:[s.bases[0],s.bases[0]]})).toThrow();
 expect(()=>parseLuaLiterals("return "+"{".repeat(34)+"}".repeat(34))).toThrow();
});
