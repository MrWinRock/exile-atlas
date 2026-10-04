export function poePath(
  resource: "character" | "league" | "ladder" | "filter" | "profile",
  name?: string,
): string {
  const segment = name ? "/" + encodeURIComponent(name) : "";
  switch (resource) {
    case "character":
      return "/character/poe2" + segment;
    case "league":
      return "/league" + segment + "?realm=poe2";
    case "ladder":
      if (!name) throw new Error("Choose a league");
      return "/league" + segment + "/ladder?realm=poe2&limit=500";
    case "filter":
      return "/item-filter" + segment;
    case "profile":
      return "/profile";
  }
}
export function rateLimitDelay(headers: Headers): number {
  let delay = 0;
  const retry = headers.get("retry-after");
  if (retry)
    delay = /^\d+(\.\d+)?$/.test(retry)
      ? Number(retry) * 1000
      : Math.max(0, Date.parse(retry) - Date.now());
  for (const rule of (headers.get("x-rate-limit-rules") ?? "").split(",")) {
    if (!rule.trim()) continue;
    const windows = (headers.get(`x-rate-limit-${rule.trim()}`) ?? "").split(",");
    const states = (headers.get(`x-rate-limit-${rule.trim()}-state`) ?? "").split(",");
    states.forEach((entry, index) => {
      const [hits, seconds, restricted] = entry.split(":").map(Number);
      const [max] = windows[index]?.split(":").map(Number) ?? [];
      delay = Math.max(delay, (restricted || 0) * 1000);
      if (max && hits >= max) delay = Math.max(delay, (seconds || 0) * 1000);
    });
  }
  return Number.isFinite(delay) ? delay : 0;
}
export type Item = {
  id?: string;
  name?: string;
  typeLine?: string;
  baseType?: string;
  icon?: string;
  ilvl?: number;
  frameTypeId?: string;
  inventoryId?: string;
  implicitMods?: ({ description: string } | string)[];
  explicitMods?: ({ description: string } | string)[];
  properties?: { name: string; values: [string, number][] }[];
  socketedItems?: Item[];
};
export type Character = {
  id: string;
  name: string;
  class: string;
  level: number;
  experience: number;
  league?: string;
  equipment?: Item[];
  skills?: Item[];
  jewels?: Item[];
  passives?: {
    hashes: number[];
    specialisations?: Record<string, number[]>;
    quest_stats?: string[];
  };
};
export type League = {
  id: string;
  name?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  rules?: { id: string; name: string }[];
};
export type LadderEntry = {
  rank: number;
  dead?: boolean;
  character: { id: string; name: string; class: string; level: number; experience?: number };
  account?: { name: string };
};
export type Status = {
  oauthConfigured: boolean;
  databaseConfigured: boolean;
  redisConfigured: boolean;
  connected: boolean;
  profile?: { name: string; uuid: string };
  setupIssues: string[];
  runtime: string;
};
