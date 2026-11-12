// Kidboard data encryption, shared by the page (browser) and scripts/encrypt.mjs (Node 20+).
// Scheme: ephemeral ECDH P-256 -> HKDF-SHA256 -> AES-256-GCM.
// The repo holds only the public key, so anyone can write data.json but only a paired device can read it.

const te = new TextEncoder(), td = new TextDecoder();
const subtle = globalThis.crypto.subtle;

function toB64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(s) {
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function aesKey(bits, usages) {
  const base = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: te.encode("kidboard-v1"), info: te.encode("data") },
    base, { name: "AES-GCM", length: 256 }, false, usages);
}

const EC = { name: "ECDH", namedCurve: "P-256" };

export async function encryptFor(pub, obj) {
  const pubKey = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: pub.x, y: pub.y, ext: true }, EC, false, []);
  const eph = await subtle.generateKey(EC, true, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "ECDH", public: pubKey }, eph.privateKey, 256);
  const key = await aesKey(bits, ["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(JSON.stringify(obj))));
  const epk = await subtle.exportKey("jwk", eph.publicKey);
  return { v: 1, alg: "ECDH-P256+HKDF-SHA256+A256GCM", epk: { x: epk.x, y: epk.y }, iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptWith(priv, env) {
  if (!env || env.v !== 1) throw new Error("unknown format");
  const privKey = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", d: priv.d, x: priv.x, y: priv.y, ext: true }, EC, false, ["deriveBits"]);
  const epk = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: env.epk.x, y: env.epk.y, ext: true }, EC, false, []);
  const bits = await subtle.deriveBits({ name: "ECDH", public: epk }, privKey, 256);
  const key = await aesKey(bits, ["decrypt"]);
  const pt = await subtle.decrypt({ name: "AES-GCM", iv: fromB64(env.iv) }, key, fromB64(env.ct));
  return JSON.parse(td.decode(pt));
}

// Pairing code: "KB1-" + d + x + y (each 43 chars base64url).
export function parsePairingCode(code) {
  const c = String(code || "").replace(/\s+/g, "");
  const m = /^KB1-([A-Za-z0-9_-]{43})([A-Za-z0-9_-]{43})([A-Za-z0-9_-]{43})$/.exec(c);
  return m ? { d: m[1], x: m[2], y: m[3] } : null;
}
export function makePairingCode(jwk) { return "KB1-" + jwk.d + jwk.x + jwk.y; }
