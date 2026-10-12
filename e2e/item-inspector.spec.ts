import {expect,test} from "@playwright/test";
test("inspector keeps annotated rolls and unknowns; cancelling preview preserves drafts",async({page})=>{
 await page.goto("/inspect");await page.getByLabel("Item text",{exact:true}).fill("Item Class: Rings\nRarity: Rare\nSun Knot\nGold Ring\n--------\nItem Level: 82\n--------\n+20(10-30)% to Fire Resistance\nUnknown power");
 await page.getByRole("button",{name:"Analyse item",exact:true}).click();await expect(page.getByText("Actual rolls: 20",{exact:true})).toBeVisible();await expect(page.getByText("Unknown power",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Preview regex",exact:true}).click();await expect(page.getByRole("button",{name:"Use complete regex",exact:true})).toBeDisabled();await page.getByRole("button",{name:"Cancel preview",exact:true}).click();await expect(page.getByLabel("Item text",{exact:true})).toHaveValue(/Unknown power/);
});
