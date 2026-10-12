import {expect,test} from "bun:test";
import {evaluateMapSafety,prepareSafetyRegex,type SafetyProfile} from "../src/lib/map-safety";
import {parseItemText} from "../src/lib/item-text";
import {validateGameSnapshot} from "../src/lib/game-data";
const snapshot=validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
const profile:SafetyProfile={id:"p",name:"Fire risk",traits:{},rules:[{id:"r",label:"Extra fire",severity:"avoid",operator:"any",conditions:[{kind:"modifier",id:"extra-fire",slot:0,min:"20",max:""}],reason:"Fire-sensitive build"}]};
const item=(roll:number,other="")=>parseItemText(`Item Class: Waystones\nRarity: Rare\nDanger\nWaystone (Tier 15)\n--------\nMonsters deal ${roll}% of Damage as Extra Fire\n${other}`);
test("actual roll threshold is exact, explanations retain traits, unknowns stay under review",()=>{
 expect(evaluateMapSafety(item(20),profile,snapshot).status).toBe("avoid");expect(evaluateMapSafety(item(19),profile,snapshot).findings).toHaveLength(0);expect(evaluateMapSafety(item(19,"Unknown power"),profile,snapshot).status).toBe("needs-review");expect(evaluateMapSafety(item(20),profile,snapshot).findings[0].reason).toBe("Fire-sensitive build");
});
test("combination requires both conditions and cannot silently become a weaker stash exclusion",()=>{
 const p={...profile,rules:[{...profile.rules[0],operator:"all" as const,conditions:[...profile.rules[0].conditions,{kind:"modifier" as const,id:"chilled-ground"}]}]};expect(evaluateMapSafety(item(20),p,snapshot).findings).toHaveLength(0);expect(evaluateMapSafety(item(20,"Area has patches of Chilled Ground"),p,snapshot).findings).toHaveLength(1);expect(prepareSafetyRegex(p,snapshot).canTransferComplete).toBe(false);
});
