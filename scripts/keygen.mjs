// Usage: node scripts/keygen.mjs
// Makes a new key pair: writes public-key.json and prints the pairing code (keep it out of the repo).
// After this, re-run encrypt.mjs and pair the iPad again with the new code.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makePairingCode } from "../crypto.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
await writeFile(join(root, "public-key.json"), JSON.stringify({ x: jwk.x, y: jwk.y }, null, 2) + "\n");
console.log(makePairingCode(jwk));
