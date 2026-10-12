import { createHash } from "node:crypto";
import { readdir,readFile,mkdir } from "node:fs/promises";
import { normalizePobBundle } from "../src/server/game-data/pob-adapter";
import { validateGameSnapshot } from "../src/lib/game-data";
import trade from "../public/data/poe2-trade-stats.json";
import {parseTradeStatsLua} from "./prepare-trade-stats";
const revision="bb52d6b368307457eb9c54bb13f1829993d390b1";
const modFiles=["ModItem.lua","ModItemExclusive.lua","ModCharm.lua","ModFlask.lua","ModJewel.lua","ModCorrupted.lua","ModRunes.lua","ModVeiled.lua"];
const baseFiles=["amulet","belt","body","boots","bow","crossbow","flail","flask","focus","gloves","helmet","jewel","mace","quiver","ring","sceptre","shield","spear","staff","talisman","wand"];
export const GAME_SOURCE_PATHS=[...modFiles.map(p=>`src/Data/${p}`),...baseFiles.map(p=>`src/Data/Bases/${p}.lua`)];
export async function prepareGameData(rev=revision){
 if(!/^[a-f0-9]{40}$/.test(rev))throw new Error("Invalid source revision");
 const files:Record<string,string>={},refs=[];
 await mkdir("data/game-data-raw",{recursive:true});
 const cached=new Set(await readdir("data/game-data-raw"));
 for(const path of GAME_SOURCE_PATHS){const name=path.includes("Bases/")?`Base-${path.split("/").at(-1)}`:path.split("/").at(-1)!;const url=`https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/${rev}/${path}`;
  let content:string;if(rev===revision&&cached.has(name))content=await readFile(`data/game-data-raw/${name}`,"utf8");else{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Source fetch ${response.status}: ${path}`);content=await response.text();}
  files[name]=content;refs.push({source:"Path of Building Community PoE2",revision:rev,url,checksum:createHash("sha256").update(content).digest("hex")});
 }
 const snapshot=normalizePobBundle(files,refs);
 // Preserve trade identities from the corresponding pinned export. A newer source
 // requires its matching TradeSiteStats literal extraction before it can be staged.
 let groups=trade.groups;
 if(rev!==trade.revision){const url=`https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/${rev}/src/Data/TradeSiteStats.lua`;const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error("Matching trade-stat source unavailable");const literal=await response.text();groups=parseTradeStatsLua(literal);snapshot.sourceRefs.push({source:"PoB trade stats",revision:rev,url,checksum:createHash("sha256").update(literal).digest("hex")});}
 snapshot.stats=groups.filter(g=>g.id!=="pseudo").flatMap(g=>g.entries);
 const categories=(text:string):string[]=>/\(Sanctum\)|Honour|Sacred Water|Merchant|Affliction/i.test(text)?["relic"]:/\(Map\)|in Map|in your Maps|Tablets?|Tower|Precursor/i.test(text)?["tablet"]:["vendor","equipment"];
 snapshot.regexDefinitions=[...new Map(snapshot.stats.filter(s=>s.type==="explicit"||s.type==="sanctum"||s.type==="rune").map(s=>[s.id+":"+s.text,{id:s.id+":"+createHash("sha256").update(s.text).digest("hex").slice(0,8),template:s.text.replace(/ \((?:Map|Sanctum)\)$/,""),categories:categories(s.text),tradeStatId:s.id}])).values()];
 snapshot.id=createHash("sha256").update(JSON.stringify({...snapshot,id:undefined,verifiedAt:undefined})).digest("hex");
 return validateGameSnapshot(snapshot);
}
if(import.meta.main){const s=await prepareGameData();await Bun.write("public/data/poe2-game-data.json",JSON.stringify(s));console.log(JSON.stringify({id:s.id,modifiers:s.modifiers.length,bases:s.bases.length,regex:s.regexDefinitions.length}));}
