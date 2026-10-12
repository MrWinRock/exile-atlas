import {z} from "zod";
import {craftRecipeSchema,craftStepSchema} from "./crafting-schema";
import {modifierEligibility,type GameSnapshot,type ModifierDefinition} from "./game-data";
import type {ParsedItem} from "./item-text";
export type CraftRecipe=z.infer<typeof craftRecipeSchema>;
export type CraftStep=z.infer<typeof craftStepSchema>;
export function createCraftRecipe():CraftRecipe{return {id:crypto.randomUUID(),name:"My crafting recipe",baseId:"",targets:[],steps:[],actualSpend:[],quoteCurrency:"Divine Orb",league:"",favorite:false,notes:""};}
export type ModifierEligibility={modifier:ModifierDefinition;status:"eligible"|"ineligible"|"unknown";reason:string};
export function eligibleModifiers(baseId:string,itemLevel:number|undefined,snapshot:GameSnapshot):ModifierEligibility[]{const bases=snapshot.bases.filter(b=>b.id===baseId||b.name===baseId);const base=bases.length===1?bases[0]:undefined;return snapshot.modifiers.map(modifier=>{const status=modifierEligibility(modifier,base,itemLevel);return {modifier,status,reason:!base?"Base is unknown or ambiguous":itemLevel===undefined?"Item level unavailable":status==="ineligible"?"Base tags or required item level do not permit this modifier":status==="eligible"?"Verified base tags and level match source rules":"Source eligibility is incomplete"};});}
export function checkCraftStep(item:ParsedItem,operation:GameSnapshot["currencyOperations"][number],snapshot:GameSnapshot):{status:"eligible"|"ineligible"|"unknown";reasons:string[];effect:string}{
 const effect=operation.effect;if(!item.rarity)return {status:"unknown",reasons:["Item rarity unavailable"],effect};if(!operation.rarities.includes(item.rarity))return {status:"ineligible",reasons:[`Requires ${operation.rarities.join(" or ")} rarity`],effect};if(item.corrupted)return {status:"ineligible",reasons:["Ordinary currency crafting cannot modify corrupted equipment"],effect};
 const bases=snapshot.bases.filter(b=>b.name===item.base||b.name===item.name);if(bases.length!==1)return {status:"unknown",reasons:["Base-specific crafting restrictions unavailable"],effect};
 if(operation.addsAffix){const annotated=item.modifiers.filter(m=>m.affixType&&m.affixIndex!==undefined);if(annotated.length!==item.modifiers.length||!annotated.length)return {status:"unknown",reasons:["Affix occupancy cannot be established from stat lines"],effect};const count=new Set(annotated.map(m=>m.affixIndex)).size;const maximum=item.rarity==="Magic"?2:6;if(count>=maximum)return {status:"ineligible",reasons:["No established empty affix slot"],effect};}
 return {status:"eligible",reasons:["Known starting-item preconditions match; resulting affixes remain random and unverified"],effect};
}
