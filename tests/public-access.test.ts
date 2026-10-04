import { expect, test } from "bun:test";
import { GET } from "../src/app/api/[...path]/route";
import { assertPublicRequestLimit } from "../src/server/public-access";

async function inMemoryWindow(
  start: number,
  trustProxy: boolean,
  run: (advance: (milliseconds: number) => void) => Promise<void>,
) {
  const originalNow = Date.now;
  const previousProxy = process.env.TRUST_PROXY;
  const previousRedis = process.env.REDIS_URL;
  let now = start;
  Date.now = () => now;
  process.env.TRUST_PROXY = String(trustProxy);
  delete process.env.REDIS_URL;
  try {
    await run((milliseconds) => {
      now += milliseconds;
    });
  } finally {
    Date.now = originalNow;
    if (previousProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previousProxy;
    if (previousRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedis;
  }
}

function visitorRequest(address: string) {
  return new Request("https://poe2.nonglabs.cloud/api/items", {
    headers: { "X-Real-IP": address, "X-Forwarded-For": address },
  });
}

test("the global API quota allows 600 requests without charging blocked visitors", async () => {
  await inMemoryWindow(Date.UTC(2030, 0, 1, 0, 1), true, async (advance) => {
    const first = visitorRequest("192.0.2.1");
    for (let i = 0; i < 60; i++) await assertPublicRequestLimit(first);
    for (let i = 0; i < 10; i++)
      await expect(assertPublicRequestLimit(first)).rejects.toMatchObject({ status: 429 });
    for (let visitor = 2; visitor <= 10; visitor++) {
      const request = visitorRequest(`192.0.2.${visitor}`);
      for (let i = 0; i < 60; i++) await assertPublicRequestLimit(request);
    }
    await expect(assertPublicRequestLimit(visitorRequest("192.0.2.11"))).rejects.toMatchObject({
      status: 429,
    });
    advance(60_000);
    // Both the global quota and the first visitor's exhausted quota must reset.
    await assertPublicRequestLimit(first);
  });
});

test("a visitor quota resets at the minute boundary and reports the remaining wait", async () => {
  await inMemoryWindow(Date.UTC(2030, 0, 1, 0, 2), true, async (advance) => {
    const request = visitorRequest("192.0.2.12");
    for (let i = 0; i < 60; i++) await assertPublicRequestLimit(request);
    advance(59_000);
    await expect(assertPublicRequestLimit(request)).rejects.toMatchObject({
      status: 429,
      retryAfter: 1,
    });
    advance(1_000);
    for (let i = 0; i < 60; i++) await assertPublicRequestLimit(request);
    await expect(assertPublicRequestLimit(request)).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    });
  });
});

test("disabled proxy trust cannot be bypassed by rotating valid visitor headers", async () => {
  await inMemoryWindow(Date.UTC(2030, 0, 1, 0, 3), false, async () => {
    for (let i = 1; i <= 60; i++) await assertPublicRequestLimit(visitorRequest(`198.51.100.${i}`));
    await expect(assertPublicRequestLimit(visitorRequest("198.51.100.61"))).rejects.toMatchObject({
      status: 429,
    });
  });
});

test("invalid real-IP headers share the direct quota despite forwarded-header rotation", async () => {
  await inMemoryWindow(Date.UTC(2030, 0, 1, 0, 4), true, async () => {
    for (let i = 0; i < 60; i++)
      await assertPublicRequestLimit(visitorRequest(`192.0.2.${256 + i}`));
    await expect(assertPublicRequestLimit(visitorRequest("not-an-ip"))).rejects.toMatchObject({
      status: 429,
    });
  });
});

test("public API limits one visitor even when untrusted forwarded headers rotate", async () => {
  const previousProxy = process.env.TRUST_PROXY;
  const previousRedis = process.env.REDIS_URL;
  process.env.TRUST_PROXY = "true";
  delete process.env.REDIS_URL;
  try {
    let response: Response | undefined;
    for (let i = 0; i < 61; i++) {
      response = await GET(
        new Request("https://poe2.nonglabs.cloud/api/rate-limit-test", {
          headers: { "X-Real-IP": "192.0.2.21", "X-Forwarded-For": `198.51.100.${i}` },
        }),
        { params: Promise.resolve({ path: ["rate-limit-test"] }) },
      );
      if (i < 60) expect(response.status).toBe(404);
    }
    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get("Retry-After"))).toBeGreaterThan(0);
    const otherVisitor = await GET(
      new Request("https://poe2.nonglabs.cloud/api/rate-limit-test", {
        headers: { "X-Real-IP": "192.0.2.22" },
      }),
      { params: Promise.resolve({ path: ["rate-limit-test"] }) },
    );
    expect(otherVisitor.status).toBe(404);
  } finally {
    if (previousProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previousProxy;
    if (previousRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedis;
  }
});

test("public currency reads reject unbounded historic requests before fetching upstream", async () => {
  const response = await GET(new Request("http://127.0.0.1:3000/api/currency?hour=0"), {
    params: Promise.resolve({ path: ["currency"] }),
  });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe("Choose an hour within the last 30 days");
});
