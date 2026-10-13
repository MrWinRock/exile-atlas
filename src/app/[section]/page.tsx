import { notFound } from "next/navigation";
import { Characters } from "@/components/characters";
import { Filters } from "@/components/filters";
import { Leagues } from "@/components/leagues";
import { Currency } from "@/components/currency";
import { Planner } from "@/components/planner";
import { Builds } from "@/components/builds";
import { Settings } from "@/components/settings";
import { Items } from "@/components/items";
import { Trade } from "@/components/trade";
import { RegexToolkit } from "@/components/regex-toolkit";
import { Genesis } from "@/components/genesis";
import { ItemInspector } from "@/components/item-inspector";
import { MapSafety } from "@/components/map-safety";
import { CraftingWorkbench } from "@/components/crafting-workbench";
import { BuildComparison } from "@/components/build-comparison";
const sections = {
  characters: Characters,
  filters: Filters,
  leagues: Leagues,
  currency: Currency,
  planner: Planner,
  builds: Builds,
  settings: Settings,
  items: Items,
  trade: Trade,
  regex: RegexToolkit,
  genesis: Genesis,
  inspect: ItemInspector,
  safety: MapSafety,
  crafting: CraftingWorkbench,
  compare: BuildComparison,
};
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const Component = sections[section as keyof typeof sections];
  if (!Component) notFound();
  return <Component />;
}
