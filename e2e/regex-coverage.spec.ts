import {expect,test} from "@playwright/test";
test("equipment exposes source-backed classes, multi-roll bounds and decimal properties",async({page})=>{
 await page.goto("/regex");await page.getByRole("tab",{name:"Equipment",exact:true}).click();
 await expect(page.getByLabel("Item class",{exact:true})).toBeVisible();
 await page.getByLabel("Attacks per Second minimum").fill("1.20");await page.getByLabel("Attacks per Second maximum").fill("1.50");
 await page.getByLabel("Search modifiers",{exact:true}).fill("Adds # to # Fire Damage");
 await page.getByLabel("Action for Adds # to # Fire Damage",{exact:true}).selectOption("want");
 await page.getByLabel("Adds # to # Fire Damage minimum",{exact:true}).fill("5");
 await page.getByLabel("Adds # to # Fire Damage roll 2 max",{exact:true}).fill("10");
 await expect(page.getByLabel("Adds # to # Fire Damage roll 2 max",{exact:true})).toHaveValue("10");
 await page.reload();await page.getByLabel("Search modifiers",{exact:true}).fill("Adds # to # Fire Damage");
 await expect(page.getByLabel("Adds # to # Fire Damage roll 2 max",{exact:true})).toHaveValue("10");
 await page.getByRole("tab",{name:"Relics",exact:true}).click();await page.getByLabel("Search modifiers",{exact:true}).fill("Traps deal");await expect(page.getByLabel("Action for Traps deal #% reduced Damage",{exact:true})).toBeVisible();
 await page.getByRole("tab",{name:"Tablets",exact:true}).click();await page.getByLabel("Search modifiers",{exact:true}).fill("Vaal Relics");await expect(page.getByLabel("Action for Expeditions contain # Vaal Relics in Map",{exact:true})).toBeVisible();
});
