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
};
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const Component = sections[section as keyof typeof sections];
  if (!Component) notFound();
  return <Component />;
}
