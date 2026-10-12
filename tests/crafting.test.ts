import {expect,test} from "bun:test";
import {eligibleModifiers,checkCraftStep} from "../src/lib/crafting";
import {validateGameSnapshot} from "../src/lib/game-data";
import {parseItemText} from "../src/lib/item-text";
import {CORE_CRAFT_OPERATIONS} from "../src/lib/crafting-operations";
const snapshot=validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
test("base tags and levels control pools; missing facts remain unknown",()=>{
 const low=eligibleModifiers("Gold Ring",1,snapshot);expect(low.find(m=>m.modifier.id==="ModItem:Strength1")?.status).toBe("eligible");expect(low.find(m=>m.modifier.id==="ModItem:Strength8")?.status).toBe("ineligible");expect(eligibleModifiers("unknown",82,snapshot).find(m=>m.modifier.id==="ModItem:Strength1")?.status).toBe("unknown");
});
test("currency preconditions never infer affix occupancy from stat line count",()=>{
 const exalt=CORE_CRAFT_OPERATIONS.find(o=>o.name==="Exalted Orb")!;expect(checkCraftStep(parseItemText("Rarity: Normal\nGold Ring"),exalt,snapshot).status).toBe("ineligible");expect(checkCraftStep(parseItemText("Rarity: Rare\nA\nGold Ring\n--------\n+20 to Strength"),exalt,snapshot).status).toBe("unknown");
});
