"use client";
import type { GenesisBranch, GenesisData } from "@/lib/genesis-data";
import { PlanningGraph } from "./planning-graph";
export function GenesisGraph(props: {
  data: GenesisData;
  allocated: string[];
  selected: string;
  onSelect: (id: string) => void;
  branch: GenesisBranch;
}) {
  return <PlanningGraph {...props} label="Genesis" />;
}
