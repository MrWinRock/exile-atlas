import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  generateRandomCodeVerifier,
  generateRandomState,
  calculatePKCECodeChallenge,
} from "oauth4webapi";
import { z } from "zod";
import { getConfig } from "./config";
import { encryptToken, decryptToken } from "./crypto";
import { getRecord, putRecord, deleteRecord } from "./storage";
import { cacheGet, cacheSet, withLock, fingerprint } from "./cache";
import { ApiError } from "./responses";
import { fetchJson } from "./poe-client";

const accountScopes = "account:profile account:characters account:item_filter";
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().positive().optional(),
});
type StoredSession = { tokens: string; expiresAt: number; profile: { uuid: string; name: string } };
type Tokens = { access: string; refresh?: string };
export type AccountSession = {
  id: string;
  profile: { uuid: string; name: string };
  accessToken: string;
};
const cookieOptions = () => ({
  httpOnly: true,
  secure: new URL(getConfig().appUrl).protocol === "https:",
  sameSite: "lax" as const,
  path: "/",
});
export function verifyOAuthState(actual: string | null, expected: string, expires: number) {
  if (
    !actual ||
    expires < Date.now() ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    throw new ApiError(
      "The account connection request expired or could not be verified. Try again.",
      400,
    );
}
async function tokenRequest(body: URLSearchParams) {
  const c = getConfig();
  body.set("client_id", c.clientId);
  body.set("client_secret", c.clientSecret);
  const response = await fetch("https://www.pathofexile.com/oauth/token", {
    method: "POST",
    body,
    headers: { "User-Agent": c.userAgent, "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new ApiError(
      "GGG could not authorize this application. Check its scopes and callback configuration.",
      401,
    );
  return tokenSchema.parse(await response.json());
}
export async function beginOAuth() {
  const c = getConfig();
  if (!c.oauthConfigured)
    throw new ApiError("Complete the GGG connection setup in Settings first.", 503);
  const state = generateRandomState(),
    verifier = generateRandomCodeVerifier();
  const jar = await cookies();
  jar.set(
    "atlas_oauth",
    encryptToken(JSON.stringify({ state, verifier, expires: Date.now() + 600000 }), c.key),
    { ...cookieOptions(), maxAge: 600 },
  );
  const url = new URL("https://www.pathofexile.com/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: c.clientId,
    response_type: "code",
    scope: accountScopes,
    state,
    redirect_uri: c.redirectUri,
    code_challenge: await calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  return url.href;
}
export async function finishOAuth(request: Request) {
  const c = getConfig();
  if (!c.oauthConfigured) throw new ApiError("OAuth is not configured", 503);
  const jar = await cookies(),
    value = jar.get("atlas_oauth")?.value;
  jar.delete("atlas_oauth");
  if (!value) throw new ApiError("Your account connection request expired. Try again.", 400);
  const pending = JSON.parse(decryptToken(value, c.key)) as {
    state: string;
    verifier: string;
    expires: number;
  };
  const url = new URL(request.url);
  verifyOAuthState(url.searchParams.get("state"), pending.state, pending.expires);
  const code = url.searchParams.get("code");
  if (!code) throw new ApiError("Account access was not granted.", 400);
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: c.redirectUri,
      code_verifier: pending.verifier,
    }),
  );
  const profile = await fetchJson<{ uuid: string; name: string }>(
    "https://api.pathofexile.com/profile",
    token.access_token,
  );
  const id = randomBytes(32).toString("base64url");
  await putRecord(
    "session:" + id,
    {
      tokens: encryptToken(
        JSON.stringify({ access: token.access_token, refresh: token.refresh_token }),
        c.key,
      ),
      expiresAt: Date.now() + (token.expires_in ?? 2419200) * 1000,
      profile,
    } satisfies StoredSession,
    90 * 86400,
  );
  jar.set("atlas_session", id, { ...cookieOptions(), maxAge: 90 * 86400 });
}
export async function getSession(): Promise<AccountSession | null> {
  const c = getConfig();
  if (!c.oauthConfigured) return null;
  const id = (await cookies()).get("atlas_session")?.value;
  if (!id || !/^[a-zA-Z0-9_-]{43}$/.test(id)) return null;
  const stored = await getRecord<StoredSession>("session:" + id);
  if (!stored) return null;
  let tokens = JSON.parse(decryptToken(stored.tokens, c.key)) as Tokens;
  if (stored.expiresAt < Date.now() + 60000) {
    if (!tokens.refresh) {
      await deleteRecord("session:" + id);
      return null;
    }
    tokens = await withLock("refresh:" + id, async () => {
      const latest = await getRecord<StoredSession>("session:" + id);
      if (!latest) throw new ApiError("Reconnect your GGG account", 401);
      if (latest.expiresAt > Date.now() + 60000)
        return JSON.parse(decryptToken(latest.tokens, c.key)) as Tokens;
      const current = JSON.parse(decryptToken(latest.tokens, c.key)) as Tokens;
      const next = await tokenRequest(
        new URLSearchParams({ grant_type: "refresh_token", refresh_token: current.refresh! }),
      );
      const fresh = { access: next.access_token, refresh: next.refresh_token ?? current.refresh };
      await putRecord(
        "session:" + id,
        {
          ...latest,
          tokens: encryptToken(JSON.stringify(fresh), c.key),
          expiresAt: Date.now() + (next.expires_in ?? 2419200) * 1000,
        },
        90 * 86400,
      );
      return fresh;
    });
  }
  return { id, profile: stored.profile, accessToken: tokens.access };
}
export async function requireSession() {
  const session = await getSession();
  if (!session)
    throw new ApiError("Connect your GGG account to view your PoE2 characters and filters.", 401);
  return session;
}
export async function logout() {
  const jar = await cookies(),
    id = jar.get("atlas_session")?.value;
  if (id && getConfig().databaseUrl) await deleteRecord("session:" + id);
  jar.delete("atlas_session");
}
export async function serviceToken(scope: "service:leagues" | "service:leagues:ladder") {
  const c = getConfig();
  if (!c.clientId || !c.clientSecret || !c.contact)
    throw new ApiError(
      "Configure your approved GGG application in Settings to load leagues and ladders.",
      503,
    );
  const key = `service-token:${fingerprint(c.clientId)}:${scope}`;
  const cached = await cacheGet<string>(key);
  if (cached) return decryptToken(cached, c.key);
  return withLock(key, async () => {
    if (!/^[0-9a-f]{64}$/i.test(c.key))
      throw new ApiError("Configure token encryption in Settings first.", 503);
    const token = await tokenRequest(
      new URLSearchParams({ grant_type: "client_credentials", scope }),
    );
    await cacheSet(
      key,
      encryptToken(token.access_token, c.key),
      Math.max(1, (token.expires_in ?? 3600) - 60),
    );
    return token.access_token;
  });
}
