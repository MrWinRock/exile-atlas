"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/workspace-store";
import { useTradeWorkspace } from "@/lib/trade-store";
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
  }, []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
