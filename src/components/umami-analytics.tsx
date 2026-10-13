import Script from "next/script";
import { connection } from "next/server";

export async function UmamiAnalytics() {
  // Read after the request boundary so Docker runtime configuration is used.
  await connection();
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim();
  if (!websiteId) return null;
  return (
    <Script
      id="umami-analytics"
      src="https://analytics.nonglabs.cloud/script.js"
      strategy="afterInteractive"
      data-website-id={websiteId}
      data-exclude-search="true"
      data-exclude-hash="true"
    />
  );
}
