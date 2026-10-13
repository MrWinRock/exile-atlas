import { expect, test } from "bun:test";
import { createCraftingStore } from "../src/lib/crafting-store";
import { createCraftRecipe } from "../src/lib/crafting";
test("saved recipes preserve order and decimal strings, imports are atomic and fresh", () => {
  const store = createCraftingStore({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
  const recipe = createCraftRecipe();
  recipe.steps = [
    {
      id: "a",
      currency: "exalted",
      quantity: "2",
      unitCost: "1.25",
      quoteCurrency: "Divine Orb",
      costSource: "manual",
      notes: "Keep",
    },
  ];
  store.getState().save(recipe);
  const json = store.getState().exportJson();
  store.getState().importJson(json);
  expect(store.getState().records[1].id).not.toBe(recipe.id);
  expect(store.getState().records[1].steps[0].unitCost).toBe("1.25");
  expect(() => store.getState().importJson("broken")).toThrow();
  expect(store.getState().records).toHaveLength(2);
});
