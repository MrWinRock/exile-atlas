import { expect, test } from "bun:test";
import { verifyOAuthState } from "../src/server/oauth";
import { GET, POST } from "../src/app/api/[...path]/route";
import { fetchJson, invalidateJson } from "../src/server/poe-client";
import { withLock } from "../src/server/cache";
import { getConfig } from "../src/server/config";
test("blank optional environment values keep local tools available", () => {
  const previous = {
    app: process.env.APP_URL,
    callback: process.env.POE_REDIRECT_URI,
    tree: process.env.TREE_EXPORT_URL,
  };
  process.env.APP_URL = "";
  process.env.POE_REDIRECT_URI = "";
  process.env.TREE_EXPORT_URL = "";
  try {
    const config = getConfig();
    expect(config.redirectUri).toBe("http://127.0.0.1:3000/api/auth/callback");
    expect(config.treeUrl).toContain("poe2-skilltree-export");
  } finally {
    for (const [key, value] of Object.entries({
      APP_URL: previous.app,
      POE_REDIRECT_URI: previous.callback,
      TREE_EXPORT_URL: previous.tree,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test("queued upstream requests complete without a false rate-limit error", async () => {
  const events: string[] = [];
  await Promise.all([
    withLock(
      "concurrency-test",
      async () => {
        events.push("first start");
        await new Promise((resolve) => setTimeout(resolve, 80));
        events.push("first end");
      },
      true,
    ),
    withLock(
      "concurrency-test",
      async () => {
        events.push("second start");
      },
      true,
    ),
  ]);
  expect(events).toEqual(["first start", "first end", "second start"]);
});
test("invalidating a filter refreshes only its owner's cached data", async () => {
  const originalFetch = globalThis.fetch;
  let version = 1;
  globalThis.fetch = (async () => Response.json({ version })) as unknown as typeof fetch;
  const url = "https://invalidation-test.example/item-filter";
  try {
    await fetchJson<{ version: number }>(url, "owner-a");
    await fetchJson<{ version: number }>(url, "owner-b");
    version = 2;
    await invalidateJson(url, "owner-a");
    expect(await fetchJson<{ version: number }>(url, "owner-a")).toEqual({ version: 2 });
    expect(await fetchJson<{ version: number }>(url, "owner-b")).toEqual({ version: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("upstream cooldown is shared across account tokens", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
  }) as unknown as typeof fetch;
  try {
    await fetchJson("https://quota-test.example/first", "account-one");
    await expect(fetchJson("https://quota-test.example/second", "account-two")).rejects.toThrow(
      "cooling down",
    );
    expect(calls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("rejects expired, missing and mismatched OAuth state", () => {
  expect(() => verifyOAuthState("abc", "abc", Date.now() - 1)).toThrow();
  expect(() => verifyOAuthState(null, "abc", Date.now() + 10000)).toThrow();
  expect(() => verifyOAuthState("bad", "abc", Date.now() + 10000)).toThrow();
  expect(() => verifyOAuthState("abc", "abc", Date.now() + 10000)).not.toThrow();
});
test("currency endpoint rejects current hour before fetching upstream", async () => {
  const hour = Math.floor(Date.now() / 3600000) * 3600;
  const response = await GET(new Request(`http://127.0.0.1:3000/api/currency?hour=${hour}`), {
    params: Promise.resolve({ path: ["currency"] }),
  });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe("Choose a completed UTC hour");
});
test("cross-origin logout is rejected before looking up a session", async () => {
  const response = await POST(
    new Request("http://127.0.0.1:3000/api/auth/logout", {
      method: "POST",
      headers: { origin: "https://untrusted.example" },
    }),
    { params: Promise.resolve({ path: ["auth", "logout"] }) },
  );
  expect(response.status).toBe(403);
});
