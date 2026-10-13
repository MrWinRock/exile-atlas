"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/workspace-store";
import { useTradeWorkspace } from "@/lib/trade-store";
import { useRegexWorkspace } from "@/lib/regex-store";
import { useGenesisWorkspace } from "@/lib/genesis-store";
import { useGameData } from "@/lib/game-data-store";
import { useSafetyProfiles } from "@/lib/map-safety-store";
import { useCraftingRecipes } from "@/lib/crafting-store";
import { useAtlasDraft, useAtlasPlans } from "@/lib/atlas-store";
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 60000 },
        },
      }),
  );
  useEffect(() => {
    void useWorkspace.persist.rehydrate();
    void useTradeWorkspace.persist.rehydrate();
    void useRegexWorkspace.persist.rehydrate();
    void useGenesisWorkspace.persist.rehydrate();
    void useGameData.getState().load();
    useSafetyProfiles.getState().load();
    useCraftingRecipes.getState().load();
    useAtlasDraft.getState().load();
    useAtlasPlans.getState().load();
  }, []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
