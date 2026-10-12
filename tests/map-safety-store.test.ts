import {expect,test} from "bun:test";
import {createSafetyStore} from "../src/lib/map-safety-store";
const profile={id:"p",name:"Profile",traits:{},rules:[]};
test("profile import is atomic, bounded and gives fresh IDs",()=>{
 const s=createSafetyStore({getItem:()=>null,setItem:()=>{},removeItem:()=>{}});s.getState().save(profile);const exported=s.getState().exportJson();s.getState().importJson(exported);expect(s.getState().records).toHaveLength(2);expect(s.getState().records[0].id).not.toBe(s.getState().records[1].id);expect(()=>s.getState().importJson('{"format":"wrong"}')).toThrow();expect(s.getState().records).toHaveLength(2);expect(()=>s.getState().importJson("x".repeat(1048577))).toThrow("1 MiB");
});
test("unreadable storage suspends writes while memory remains exportable",()=>{
 let writes=0;const s=createSafetyStore({getItem:()=>"broken",setItem:()=>{writes++;},removeItem:()=>{}});s.getState().load();s.getState().save(profile);expect(writes).toBe(0);expect(s.getState().warning).toContain("Unreadable");expect(s.getState().exportJson()).toContain("Profile");
});
