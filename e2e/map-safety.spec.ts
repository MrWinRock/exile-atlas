import {expect,test} from "@playwright/test";
test("saved safety profile explains actual risk and persists across reload",async({page})=>{
 await page.goto("/safety");await page.getByRole("button",{name:"Add risk rule",exact:true}).click();await page.getByLabel("Profile name",{exact:true}).fill("Fire-sensitive");await page.getByRole("button",{name:"Save profile",exact:true}).click();
 await page.getByLabel("Waystone text",{exact:true}).fill("Item Class: Waystones\nRarity: Rare\nDanger\nWaystone (Tier 15)\n--------\nMonsters deal 20% of Damage as Extra Fire\nUnknown power");await page.getByRole("button",{name:"Check Waystone",exact:true}).click();await expect(page.getByTestId("safety-status")).toHaveText("Avoid");await expect(page.getByText("Unknown power",{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel("Saved risk profile",{exact:true})).toContainText("Fire-sensitive");
});
