import "server-only";
import { neon } from "@neondatabase/serverless";
import { checkBotId } from "botid/server";
import { createDatabaseFinderHandler, type DatabaseResult, type FinderLiveDependencies } from "./live";

function dependencies(): FinderLiveDependencies | null {
  const databaseUrl = process.env.FINDER_DATABASE_URL;
  const secret = process.env.FINDER_SECRET;
  if (!databaseUrl || !secret || !/^[a-f0-9]{64}$/.test(secret) || process.env.VERCEL !== "1") return null;
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgresql:" || decodeURIComponent(url.username) !== "merkalku_finder_web" || !url.hostname.endsWith(".neon.tech") || url.searchParams.get("sslmode") !== "require") return null;
    const sql = neon(databaseUrl, { fetchOptions: { cache: "no-store" } });
    const previewHost = process.env.VERCEL_BRANCH_URL;
    const origins = process.env.VERCEL_ENV === "production" ? ["https://www.merkalku.de"] : previewHost && /^[a-z0-9-]+\.vercel\.app$/.test(previewHost) ? [`https://${previewHost}`] : [];
    return {
      key: Buffer.from(secret, "hex"), origins, onVercel: true, now: Date.now,
      verifyBot: () => checkBotId({ developmentOptions: { isDevelopment: false }, advancedOptions: { checkLevel: "basic" } }),
      entry: async (ipHash) => { const rows = await sql`SELECT finder_api.entry(${ipHash}) AS result`; return rows[0]?.result ?? { allowed: false, reason: "unavailable" }; },
      search: async (input) => {
        const rows = await sql`SELECT finder_api.search(${input.budgetHash}, ${input.sessionHash}, ${input.ipHash}, ${input.budgetIssuedAt}::timestamptz, ${input.sessionIssuedAt}::timestamptz, ${input.query.postcode}, ${input.query.radiusKm}::integer, ${input.after ?? null}, ${input.snapshot ?? null}) AS result`;
        return (rows[0]?.result ?? { allowed: false, reason: "unavailable" }) as DatabaseResult;
      },
    };
  } catch { return null; }
}

export const finderPost = (request: Request) => createDatabaseFinderHandler(dependencies())(request);
