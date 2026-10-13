export type DatasetCheck = { source: string; installed: string; upstream?: string; error?: string };
export function sourceUpdateStatus(sources: DatasetCheck[]): "available" | "current" | "offline" {
  return sources.some((s) => s.error)
    ? "offline"
    : sources.some((s) => s.upstream !== s.installed)
      ? "available"
      : "current";
}
