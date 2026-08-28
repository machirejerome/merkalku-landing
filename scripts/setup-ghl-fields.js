/* Legt die Custom Fields für den Preisrechner in GoHighLevel an —
   aber NUR, wenn sie noch nicht existieren. Einmalig ausführen:
   node scripts/setup-ghl-fields.js */

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

const TOKEN = process.env.GHL_API_TOKEN;
const LOCATION = process.env.GHL_LOCATION_ID;
if (!TOKEN || !LOCATION) {
  console.error("GHL_API_TOKEN / GHL_LOCATION_ID fehlen (.env.local)");
  process.exit(1);
}

const BASE = "https://services.leadconnectorhq.com";
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Version: "2021-07-28",
  "Content-Type": "application/json",
};

const WANTED = [
  { name: "Ausschreibungen pro Monat", key: "ausschreibungen_pro_monat", dataType: "NUMERICAL" },
  { name: "Stunden pro Ausschreibung", key: "stunden_pro_ausschreibung", dataType: "NUMERICAL" },
  { name: "Kalkulation Wer", key: "kalkulation_wer", dataType: "SINGLE_OPTIONS", options: ["Inhaber selbst", "Kalkulator", "Büro", "Extern"] },
  { name: "Kalkulation Tool", key: "kalkulation_tool", dataType: "SINGLE_OPTIONS", options: ["Excel", "Software", "Papier und Erfahrung"] },
  { name: "Ersparnis pro Monat EUR", key: "ersparnis_pro_monat_eur", dataType: "NUMERICAL" },
  { name: "Liegen gelassene Ausschreibungen", key: "liegen_gelassene_ausschreibungen", dataType: "SINGLE_OPTIONS", options: ["Keine", "1–2 pro Monat", "3–5 pro Monat", "mehr als 5"] },
];

(async () => {
  const res = await fetch(`${BASE}/locations/${LOCATION}/customFields?model=contact`, { headers: HEADERS });
  if (!res.ok) {
    console.error("Felder laden fehlgeschlagen:", res.status, await res.text());
    process.exit(1);
  }
  const existing = (await res.json()).customFields || [];
  const existingKeys = new Set(existing.map((f) => (f.fieldKey || "").replace(/^contact\./, "")));

  for (const field of WANTED) {
    if (existingKeys.has(field.key)) {
      console.log(`✓ existiert bereits: contact.${field.key}`);
      continue;
    }
    const body = { name: field.name, dataType: field.dataType, model: "contact" };
    if (field.options) body.options = field.options;
    const create = await fetch(`${BASE}/locations/${LOCATION}/customFields`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    const text = await create.text();
    if (create.ok) {
      const created = JSON.parse(text).customField || {};
      console.log(`+ angelegt: ${field.name} → ${created.fieldKey || "?"} (${created.id || "?"})`);
    } else {
      console.error(`✗ Fehler bei "${field.name}": ${create.status} ${text}`);
    }
  }
})();
