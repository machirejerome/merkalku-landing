export const FINDER_RADII = [10, 25, 50, 100] as const;
export const FINDER_PAGE_SIZE = 10;
export const FINDER_MAX_PAGES = 2;
export const FINDER_BODY_LIMIT = 2048;
export const FINDER_BODY_TIMEOUT_MS = 2000;

export type FinderQuery = { postcode: string; radiusKm: number; cursor?: string };
export type ParseResult = { ok: true; query: FinderQuery } | { ok: false; message: string };

/** Shape validation only. Live postcode existence is checked by the dedicated reader. */
export function parseFinderQuery(value: unknown): ParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, message: "Bitte PLZ und Umkreis angeben." };
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["postcode", "radiusKm", "cursor"].includes(key))) return { ok: false, message: "Unzulässige Suchparameter." };
  if (typeof body.postcode !== "string" || !/^[0-9]{5}$/.test(body.postcode) || body.postcode === "00000") return { ok: false, message: "Bitte eine fünfstellige deutsche PLZ eingeben." };
  if (typeof body.radiusKm !== "number" || !FINDER_RADII.some((radius) => radius === body.radiusKm)) return { ok: false, message: "Bitte einen Umkreis von 10, 25, 50 oder 100 km wählen." };
  if (body.cursor !== undefined && (typeof body.cursor !== "string" || body.cursor.length < 20 || body.cursor.length > 1536 || !/^[A-Za-z0-9_-]+$/.test(body.cursor))) return { ok: false, message: "Die Suchseite ist ungültig. Bitte die Suche neu starten." };
  return { ok: true, query: { postcode: body.postcode, radiusKm: body.radiusKm, ...(body.cursor ? { cursor: body.cursor as string } : {}) } };
}

export async function readFinderRequest(request: Request): Promise<ParseResult> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return { ok: false, message: "JSON-Anfrage erforderlich." };
  if (Number(request.headers.get("content-length")) > FINDER_BODY_LIMIT || !request.body) return { ok: false, message: "Die Suchanfrage ist zu groß oder leer." };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timeout: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("Finder request body timeout"));
      void reader.cancel().catch(() => undefined);
    }, FINDER_BODY_TIMEOUT_MS);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), expired]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > FINDER_BODY_LIMIT) { await reader.cancel(); return { ok: false, message: "Die Suchanfrage ist zu groß." }; }
      chunks.push(value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    return parseFinderQuery(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data)));
  } catch { return { ok: false, message: "Die Suchanfrage konnte nicht gelesen werden." }; }
  finally { clearTimeout(timeout!); reader.releaseLock(); }
}
