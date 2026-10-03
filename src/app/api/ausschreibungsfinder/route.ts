import { createLiveSearchHandler } from "@/lib/finder/server";

export const runtime = "nodejs";

// Deliberately disconnected until the separate reader AND real guard are reviewed.
// An environment variable or a production service key must never unlock this route.
export const POST = createLiveSearchHandler(null);
