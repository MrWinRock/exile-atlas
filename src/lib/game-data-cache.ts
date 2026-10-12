import {validateGameSnapshot,type GameSnapshot} from "./game-data";
export async function verifySnapshotIntegrity(raw:unknown):Promise<GameSnapshot> {
 const s=validateGameSnapshot(raw);const payload=new TextEncoder().encode(JSON.stringify({...s,id:undefined,verifiedAt:undefined}));
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",payload)),b=>b.toString(16).padStart(2,"0")).join("");if(digest!==s.id)throw new Error("Snapshot integrity check failed");return s;
}
export type SnapshotCache={read:(id:string)=>Promise<GameSnapshot|undefined>;write:(snapshot:GameSnapshot)=>Promise<void>};
export function createSnapshotSelection(cache:SnapshotCache,persistPointer:(id:string)=>void,initial:GameSnapshot) {
 let current=initial;
 return {active:()=>current,select:async(raw:unknown)=>{const s=await verifySnapshotIntegrity(raw);await cache.write(s);persistPointer(s.id);current=s;return s;},restore:async(id:string)=>{const raw=await cache.read(id);if(!raw)throw new Error("Selected snapshot is unavailable; restore it or explicitly choose bundled data.");const s=await verifySnapshotIntegrity(raw);current=s;return s;}};
}
async function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open("exile-atlas-game-data",1);req.onupgradeneeded=()=>req.result.createObjectStore("snapshots",{keyPath:"id"});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export const browserSnapshotCache:SnapshotCache={
 read:async(id)=>{const db=await database();try{return await new Promise<GameSnapshot|undefined>((resolve,reject)=>{const req=db.transaction("snapshots","readonly").objectStore("snapshots").get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}},
 write:async(s)=>{const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("snapshots","readwrite");tx.objectStore("snapshots").put(s);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error("Snapshot cache write failed"));tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
};
