"use client";
import {create} from "zustand";
import type {GameSnapshot} from "./game-data";
import {browserSnapshotCache,createSnapshotSelection,verifySnapshotIntegrity} from "./game-data-cache";
const key="exile-atlas-game-data-v1";
type DataState={snapshot?:GameSnapshot;previousId?:string;staged?:GameSnapshot;error:string;loading:boolean;load:()=>Promise<void>;stage:(raw:unknown)=>Promise<void>;selectSnapshot:(s:GameSnapshot)=>Promise<void>;rollback:()=>Promise<void>};
let loading:Promise<void>|undefined;
export const useGameData=create<DataState>((set,get)=>({error:"",loading:true,
 load:()=>loading??= (async()=>{try{const response=await fetch("/data/poe2-game-data.json");if(!response.ok)throw new Error("Bundled game data unavailable");const bundled=await verifySnapshotIntegrity(await response.json());const prefs=JSON.parse(localStorage.getItem(key)??"{}");if(prefs.activeId&&prefs.activeId!==bundled.id){const selected=await browserSnapshotCache.read(prefs.activeId);if(!selected)throw new Error("Selected dataset is unavailable. Explicitly choose bundled data to recover.");set({snapshot:await verifySnapshotIntegrity(selected),previousId:prefs.previousId});}else set({snapshot:bundled,previousId:prefs.previousId});set({loading:false});}catch(error){set({loading:false,error:error instanceof Error?error.message:"Data could not be loaded"});}})(),
 stage:async(raw)=>{const s=await verifySnapshotIntegrity(raw);await browserSnapshotCache.write(s);set({staged:s});},
 selectSnapshot:async(raw)=>{try{const old=get().snapshot;if(old)await browserSnapshotCache.write(old);const selector=createSnapshotSelection(browserSnapshotCache,id=>localStorage.setItem(key,JSON.stringify({activeId:id,previousId:old?.id})),old??raw);const s=await selector.select(raw);set({snapshot:s,previousId:old?.id,staged:undefined,error:""});}catch(error){set({error:error instanceof Error?error.message:"Selection failed"});throw error;}},
 rollback:async()=>{const id=get().previousId;if(!id)throw new Error("No previous snapshot");const s=await browserSnapshotCache.read(id);if(!s)throw new Error("Previous snapshot unavailable");await get().selectSnapshot(s);}
}));
