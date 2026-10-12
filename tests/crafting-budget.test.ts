import {expect,test} from "bun:test";
import {summarizeCraftBudget} from "../src/lib/crafting-budget";
import {createCraftRecipe} from "../src/lib/crafting";
test("decimal budgets are exact and missing prices are not zero",()=>{
 const recipe=createCraftRecipe();recipe.quoteCurrency="divine";recipe.steps=[{id:"a",currency:"exalted",quantity:"2",unitCost:"1.25",quoteCurrency:"divine",costSource:"manual",notes:""}];expect(summarizeCraftBudget(recipe,[]).pricedSubtotal).toBe("2.5");
 recipe.steps=[{...recipe.steps[0],quantity:"1",unitCost:"0.1"},{...recipe.steps[0],id:"b",quantity:"1",unitCost:"0.2"}];expect(summarizeCraftBudget(recipe,[]).pricedSubtotal).toBe("0.3");recipe.steps.push({...recipe.steps[0],id:"c",currency:"chaos",unitCost:undefined});expect(summarizeCraftBudget(recipe,[]).complete).toBe(false);expect(summarizeCraftBudget(recipe,[]).unpriced).toContain("c");
});
test("actual budget comparison preserves the product precision of six-decimal inputs",()=>{
 const recipe=createCraftRecipe();recipe.quoteCurrency="divine";recipe.budget="1";recipe.actualSpend=[{id:"a",currency:"exalted",quantity:"0.123456",unitCost:"0.123456",quoteCurrency:"divine",costSource:"manual",notes:""}];expect(summarizeCraftBudget(recipe,[]).remainingBudget).toBe("0.984758616064");
});
test("raw mixed currencies and actual spend survive; invalid quantities fail validation",()=>{
 const recipe=createCraftRecipe();recipe.steps=[{id:"a",currency:"exalted",quantity:"-1",quoteCurrency:"divine",costSource:"manual",notes:""}];expect(()=>summarizeCraftBudget(recipe,[])).toThrow();
});
