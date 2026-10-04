import { z } from "zod";
import { poePath, type Status } from "@/lib/poe";
import { completedHour } from "@/lib/currency";
import { getConfig } from "@/server/config";
import { ApiError, assertSameOrigin, errorResponse } from "@/server/responses";
import {
  beginOAuth,
  finishOAuth,
  getSession,
  requireSession,
  logout,
  serviceToken,
} from "@/server/oauth";
import { fetchJson, invalidateJson } from "@/server/poe-client";
import { getCurrency, getTree } from "@/server/public-data";
import { getRecord, putRecord } from "@/server/storage";
import { getItemCatalogue } from "@/server/item-artwork";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params,
      url = new URL(request.url),
      c = getConfig();
    if (path.join("/") === "auth/start") return Response.redirect(await beginOAuth());
    if (path.join("/") === "auth/callback") {
      try {
        await finishOAuth(request);
        return Response.redirect(new URL("/characters", c.appUrl));
      } catch {
        return Response.redirect(new URL("/settings?connection=failed", c.appUrl));
      }
    }
    let data: unknown;
    switch (path[0]) {
      case "status": {
        const session = await getSession();
        data = {
          oauthConfigured: c.oauthConfigured,
          databaseConfigured: !!c.databaseUrl,
          redisConfigured: !!c.redisUrl,
          connected: !!session,
          profile: session?.profile,
          setupIssues: c.issues,
          runtime: typeof Bun !== "undefined" ? `Bun ${Bun.version}` : "Bun required",
        } satisfies Status;
        break;
      }
      case "characters": {
        const session = await requireSession();
        data = await fetchJson(
          "https://api.pathofexile.com" + poePath("character", path[1]),
          session.accessToken,
        );
        break;
      }
      case "filters": {
        const session = await requireSession();
        const result = await fetchJson<{
          filters?: { realm: string }[];
          filter?: { realm: string };
        }>("https://api.pathofexile.com" + poePath("filter", path[1]), session.accessToken);
        if (result.filter && result.filter.realm !== "poe2")
          throw new ApiError("Only PoE2 filters are available in this workspace", 400);
        data = result.filters
          ? { filters: result.filters.filter((f) => f.realm === "poe2") }
          : result;
        break;
      }
      case "leagues":
        data = await fetchJson(
          "https://api.pathofexile.com" + poePath("league", path[1]),
          await serviceToken("service:leagues"),
          300,
        );
        break;
      case "ladder": {
        const league = z.string().min(1).max(200).parse(url.searchParams.get("league"));
        const offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(999)
          .parse(url.searchParams.get("offset") ?? 0);
        data = await fetchJson(
          "https://api.pathofexile.com" + poePath("ladder", league) + "&offset=" + offset,
          await serviceToken("service:leagues:ladder"),
          120,
        );
        break;
      }
      case "currency": {
        const hour = url.searchParams.has("hour")
          ? Number(url.searchParams.get("hour"))
          : completedHour();
        try {
          data = await getCurrency(hour);
        } catch (error) {
          if (error instanceof Error && error.message === "Choose a completed UTC hour")
            throw new ApiError(error.message);
          throw error;
        }
        break;
      }
      case "history": {
        if (!c.databaseUrl) {
          data = { snapshots: [], configured: false };
          break;
        }
        const now = completedHour(),
          snapshots = [];
        for (let i = 23; i >= 0; i--) {
          const snapshot = await getRecord("currency:" + (now - i * 3600));
          if (snapshot) snapshots.push(snapshot);
        }
        data = { snapshots, configured: true };
        break;
      }
      case "tree":
        data = await getTree();
        break;
      case "items":
        data = await getItemCatalogue();
        break;
      default:
        throw new ApiError("Endpoint not found", 404);
    }
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request, getConfig().appUrl);
    const { path } = await context.params;
    if (path.join("/") === "auth/logout") {
      await logout();
      return Response.json({ ok: true });
    }
    if (path[0] !== "filters") throw new ApiError("Endpoint not found", 404);
    const session = await requireSession();
    const text = await request.text();
    if (text.length > 1_100_000) throw new ApiError("Filter is too large", 413);
    const body = z
      .object({
        filter_name: z.string().trim().min(1).max(120),
        filter: z.string().min(1).max(1000000),
        description: z.string().max(10000).optional(),
        public: z.boolean().optional(),
      })
      .parse(JSON.parse(text));
    if (path[1]) {
      const owned = await fetchJson<{ filter: { realm: string } }>(
        "https://api.pathofexile.com" + poePath("filter", path[1]),
        session.accessToken,
      );
      if (owned.filter.realm !== "poe2")
        throw new ApiError("Only PoE2 filters can be updated", 403);
    }
    const data = await fetchJson(
      "https://api.pathofexile.com" + poePath("filter", path[1]) + "?validate=true",
      session.accessToken,
      0,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, realm: "poe2" }),
      },
    );
    await invalidateJson("https://api.pathofexile.com" + poePath("filter"), session.accessToken);
    if (path[1])
      await invalidateJson(
        "https://api.pathofexile.com" + poePath("filter", path[1]),
        session.accessToken,
      );
    await putRecord(
      "filter-last-sync:" + session.profile.uuid,
      { at: new Date().toISOString() },
      86400,
    );
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
