import {expect,test} from "bun:test";
import {extractDbDefinitions} from "../src/server/game-data/db-adapter";
test("modifier HTML is read as inert JSON with sourced bounds, never executable script",()=>{
 const rows={normal:[{str:"Traps deal <span>(3<span>—</span>10)</span>% reduced Damage"}]};const html=`<script>new ModsView(${JSON.stringify(rows)});doSomething();</script>`;
 const defs=extractDbDefinitions(html,"relic","https://poe2db.tw/us/Relics");expect(defs[0].template).toBe("Traps deal #% reduced Damage");expect(defs[0].numericSlots![0].domain).toEqual([3,10]);
 expect(()=>extractDbDefinitions('new ModsView({normal:runCode()})',"relic","https://example.test")).toThrow();
});
