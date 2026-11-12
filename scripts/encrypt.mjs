// Usage: node scripts/encrypt.mjs <plain.json>
// Validates the plain board data, encrypts it with public-key.json and writes data.json.
// Never commit the plain file.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { encryptFor } from "../crypto.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) { console.error("Usage: node scripts/encrypt.mjs <plain.json>"); process.exit(1); }

const data = JSON.parse(await readFile(src, "utf8"));
const errors = [];
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^\d{2}:\d{2}$/, WEEK = /^\d{4}-W\d{2}$/;
for (const k of ["kids", "events", "homework", "words"]) if (!Array.isArray(data[k])) errors.push(`${k} must be an array`);
const COLOR = /^#[0-9a-fA-F]{6}$/, ID = /^[a-z0-9-]+$/;
(data.kids || []).forEach((k, i) => {
  if (!ID.test(k.id || "")) errors.push(`kids[${i}] id must be lowercase letters, digits or -`);
  if (!k.name) errors.push(`kids[${i}] missing name`);
  if (k.color && !COLOR.test(k.color)) errors.push(`kids[${i}] color must be #RRGGBB`);
});
const KIDS = new Set((data.kids || []).map(k => k.id));
(data.events || []).forEach((e, i) => {
  if (!e.id) errors.push(`events[${i}] missing id`);
  if (!DATE.test(e.date || "")) errors.push(`events[${i}] bad date`);
  if (e.endDate && !DATE.test(e.endDate)) errors.push(`events[${i}] bad endDate`);
  for (const f of ["start", "end"]) if (e[f] && !TIME.test(e[f])) errors.push(`events[${i}] bad ${f}`);
  if (!e.title) errors.push(`events[${i}] missing title`);
  if (!Array.isArray(e.kids) || e.kids.some(k => !KIDS.has(k))) errors.push(`events[${i}] kids must list ids from kids[]`);
});
(data.homework || []).forEach((h, i) => {
  if (!h.id) errors.push(`homework[${i}] missing id`);
  if (!KIDS.has(h.kid)) errors.push(`homework[${i}] bad kid`);
  if (!WEEK.test(h.week || "")) errors.push(`homework[${i}] bad week`);
  if (h.due && !DATE.test(h.due)) errors.push(`homework[${i}] bad due`);
  if (!h.text) errors.push(`homework[${i}] missing text`);
});
(data.words || []).forEach((w, i) => {
  if (!KIDS.has(w.kid)) errors.push(`words[${i}] bad kid`);
  if (!WEEK.test(w.week || "")) errors.push(`words[${i}] bad week`);
});
if (errors.length) { console.error("Invalid board data:\n- " + errors.join("\n- ")); process.exit(1); }

data.updatedAt = data.updatedAt || new Date().toISOString();
const pub = JSON.parse(await readFile(join(root, "public-key.json"), "utf8"));
const env = await encryptFor(pub, data);
await writeFile(join(root, "data.json"), JSON.stringify(env) + "\n");
console.log(`data.json written: ${data.events.length} events, ${data.homework.length} homework, ${data.words.length} word lists`);
