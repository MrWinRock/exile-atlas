import {expect,test} from "bun:test";
import {prepareItemTransfer} from "../src/lib/item-transfer";
import {validateGameSnapshot} from "../src/lib/game-data";
test("item transfers retain source text and exact rolls; unknown lines block complete transfer",async()=>{
 const snapshot=validateGameSnapshot(await Bun.file("public/data/poe2-game-data.json").json());const text="Item Class: Rings\nRarity: Rare\nA\nGold Ring\n--------\nItem Level: 82\n--------\n+6 to Strength\nUnrecognized power";
 const transfer=prepareItemTransfer(text,snapshot);expect(transfer.itemText).toBe(text);expect(transfer.snapshotId).toBe(snapshot.id);expect(transfer.draft.wanted.some(s=>s.min==="6"&&s.max==="6")).toBe(true);expect(transfer.unresolved).toContain("Unrecognized power");expect(transfer.complete).toBe(false);
});
