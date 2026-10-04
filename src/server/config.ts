export function getConfig() {
  const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";
  const clientId = process.env.POE_CLIENT_ID ?? "",
    clientSecret = process.env.POE_CLIENT_SECRET ?? "",
    contact = process.env.POE_CONTACT ?? "",
    key = process.env.TOKEN_ENCRYPTION_KEY ?? "";
  const redirectUri = process.env.POE_REDIRECT_URI || new URL("/api/auth/callback", appUrl).href;
  const issues: string[] = [];
  if (!clientId || !clientSecret)
    issues.push("Add your registered GGG OAuth client ID and secret.");
  if (!contact) issues.push("Set a contact address for your application's User-Agent.");
  if (!/^[0-9a-f]{64}$/i.test(key))
    issues.push("Set a 64-character hexadecimal token encryption key.");
  if (!process.env.DATABASE_URL) issues.push("Connect PostgreSQL for secure account sessions.");
  if (new URL(redirectUri).protocol !== "https:")
    issues.push("Configure a registered HTTPS callback domain for GGG.");
  return {
    appUrl,
    clientId,
    clientSecret,
    contact,
    key,
    redirectUri,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    treeUrl:
      process.env.TREE_EXPORT_URL ||
      "https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/main/data.json",
    issues,
    oauthConfigured: issues.length === 0,
    userAgent: `OAuth ${clientId || "exile-atlas"}/0.1.0 (contact: ${contact || "local-development"})`,
  };
}
