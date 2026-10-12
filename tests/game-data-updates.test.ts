import {expect,test} from "bun:test";
import {createSnapshotSelection,verifySnapshotIntegrity} from "../src/lib/game-data-cache";
import {validateGameSnapshot} from "../src/lib/game-data";
import {stageGameSnapshot,getGameSnapshot} from "../src/server/game-data/service";
test("dataset endpoints reject caller URLs and invalid identities before upstream access",async()=>{
 await expect(stageGameSnapshot("https://attacker.test/data")).rejects.toThrow("Invalid source revision");await expect(getGameSnapshot("../data")).rejects.toThrow("Invalid snapshot identity");
});
test("failed cache/schema/checksum preserves active data; staging alone does not select",async()=>{
 const snapshot=validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
 const store=createSnapshotSelection({read:async()=>snapshot,write:async()=>{throw new Error("quota");}},()=>{},snapshot);
 await expect(store.select(snapshot)).rejects.toThrow("quota");expect(store.active().id).toBe(snapshot.id);
 await expect(verifySnapshotIntegrity({...snapshot,modifiers:[]})).rejects.toThrow("integrity");
});
test("explicit selection and rollback cache full snapshots without changing source objects",async()=>{
 const snapshot=validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());
 const cache=new Map<string,typeof snapshot>();let pointer="";
 const store=createSnapshotSelection({read:async id=>cache.get(id),write:async s=>{cache.set(s.id,s);}},id=>{pointer=id;},snapshot);
 await store.select(snapshot);expect(pointer).toBe(snapshot.id);expect(cache.get(pointer)).toEqual(snapshot);
 await expect(store.restore("f".repeat(64))).rejects.toThrow("unavailable");expect(store.active().id).toBe(snapshot.id);
});
