import { exampleSearch } from "@/lib/finder/examples";
import { readFinderRequest } from "@/lib/finder/schema";
import { finderResponse } from "@/lib/finder/server";

export const runtime = "nodejs";

/** Only freely invented examples; called by the explicit “Beispiel ansehen” action. */
export async function POST(request: Request) {
  const parsed = await readFinderRequest(request);
  if (!parsed.ok) return finderResponse({ message: parsed.message }, 400);
  if (parsed.query.cursor) return finderResponse({ message: "Die Beispielansicht hat keine weiteren Seiten." }, 400);
  return finderResponse({ mode: "example", message: "Alle Angaben sind frei erfunden. Keine aktuellen Ausschreibungen; die PLZ wird nicht geocodiert.", items: exampleSearch(parsed.query.radiusKm), nextCursor: null });
}
