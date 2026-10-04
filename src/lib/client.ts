"use client";
import { useQuery } from "@tanstack/react-query";
import type { Status } from "./poe";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "This request could not be completed");
  return data;
}
export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: () => api<Status>("status"),
    staleTime: 60000,
    retry: false,
  });
}
