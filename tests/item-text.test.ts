import { expect, test } from "bun:test";
import { parseItemText } from "../src/lib/item-text";
const text="Item Class: Rings\r\nRarity: Rare\r\nSun Knot\r\nGold Ring\r\n--------\r\nQuality: +10%\r\nAttacks per Second: 1.50\r\n--------\r\nRequirements:\r\nLevel: 24\r\nStr: 12\r\n--------\r\nItem Level: 82\r\n--------\r\n+20(10-30)% to Fire Resistance\r\nAdds 5(1-8) to 10(9-15) Fire Damage\r\nUnknown power\r\n--------\r\nCorrupted";
test("advanced annotations never replace actual rolls or disappear",()=>{
 const p=parseItemText(text);expect(p.itemLevel).toBe(82);expect(p.requiredLevel).toBe(24);expect(p.properties.attackRate).toBe(1.5);expect(p.base).toBe("Gold Ring");expect(p.modifiers[0].actualRolls).toEqual([20]);expect(p.modifiers[0].annotations).toEqual([[10,30]]);expect(p.modifiers[1].actualRolls).toEqual([5,10]);expect(p.unknownLines.map(l=>l.text)).toContain("Unknown power");expect(p.original).toBe(text);expect(p.corrupted).toBe(true);
});
test("basic and advanced modifier text share normalized actual-roll lines",()=>{
 expect(parseItemText("Rarity: Rare\nA\nB\n--------\n+20% to Fire Resistance").modifiers[0].text).toBe("+20% to Fire Resistance");
 expect(parseItemText(text).modifiers[0].text).toBe("+20% to Fire Resistance");
 expect(()=>parseItemText("é".repeat(32769))).toThrow("64 KiB");
});
test("fixtures preserve explicit affix annotations, required facts and source positions",async()=>{
 const advanced=parseItemText(await Bun.file("tests/fixtures/items/rare-advanced.txt").text());
 const basic=parseItemText(await Bun.file("tests/fixtures/items/rare-basic.txt").text());
 expect(advanced.modifiers.map(m=>m.actualRolls)).toEqual(basic.modifiers.map(m=>m.actualRolls));
 expect(advanced.modifiers[0].affixType).toBe("Suffix");expect(advanced.modifiers[0].tier).toBe("2");expect(advanced.modifiers[0].line).toBe(8);
 const p=parseItemText(text);expect(p.requirements.Str).toBe(12);expect(p.properties.quality).toBe(10);expect(p.itemClass).toBe("Rings");
 for(const path of ["waystone-basic","waystone-advanced"])expect(parseItemText(await Bun.file(`tests/fixtures/items/${path}.txt`).text()).properties.itemRarity).toBe(40);
});
