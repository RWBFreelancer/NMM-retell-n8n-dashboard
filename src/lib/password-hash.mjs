/**
 * Password hashing, in one file, used by three things:
 * the app (src/lib/auth.ts), npm run hash-password, and npm run check-login.
 *
 * Plain JavaScript on purpose. The two npm scripts are plain Node and cannot
 * read a TypeScript file, and a second copy of a password check is a bug
 * waiting to happen. One file, three callers, no chance of disagreement.
 *
 * WHY NOT BCRYPT ANY MORE
 *
 * A bcrypt hash starts with `$2b$12$`. Next.js reads `$2b` in a .env file as a
 * variable name and eats part of the hash, so every login fails and nothing
 * says why. Wrapping it in base64 hid the `$` but added a second shape to get
 * wrong, and base64 itself contains `+`, `/` and `=`, which some paste boxes
 * and URL fields mangle.
 *
 * So the stored value is now a name, digits, hex and dots: `s1.32768.8.1.…`.
 * No `$`, no `+`, no `/`, no `=`, no quotes, no spaces. There is nothing left
 * in it for a .env file, a settings box, a shell or a URL to touch.
 *
 * The hash is scrypt, from Node's own crypto. It is deliberately slow, so
 * guessing passwords in bulk is expensive. No package to install.
 *
 * Old bcrypt values still work, so nobody has to change anything in a hurry.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * scrypt settings. `cost` is the CPU and memory work factor.
 *
 * 2^15 takes roughly 100 ms on a Vercel function, which nobody notices once
 * per sign-in but which makes bulk guessing painful. The numbers are stored
 * inside the value, so raising them later does not break an old password.
 */
const COST = 32768; // 2^15
const BLOCK_SIZE = 8;
const PARALLEL = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

/** The marker at the front, so the format can change again safely one day. */
const PREFIX = "s1";

/**
 * Turn a password into the value for DASHBOARD_PASSWORD_HASH.
 *
 * Shape: `s1.<cost>.<blockSize>.<parallel>.<salt hex>.<key hex>`
 * Characters: the letters s, a to f, the digits, and dots. Nothing else, ever.
 */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_BYTES, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLEL,
    // scrypt needs headroom or Node refuses the job outright.
    maxmem: 256 * 1024 * 1024,
  });
  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLEL,
    salt.toString("hex"),
    Buffer.from(key).toString("hex"),
  ].join(".");
}

/**
 * Make a password a person can actually type.
 *
 * Five groups of four, joined by dashes, from an alphabet with no lookalikes:
 * no O or 0, no l, 1 or I. That is 31 characters to choose from and 20 picks,
 * which is about 99 bits of randomness. Far past anything guessable, and still
 * easy to read off a screen and type on a phone.
 *
 * randomBytes is rejection-sampled, so every letter is equally likely. Taking
 * a byte modulo 31 would quietly favour the first few letters.
 */
export function makePassword(groups = 5, groupSize = 4) {
  const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // 31 characters
  const need = groups * groupSize;
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

  let out = "";
  while (out.length < need) {
    for (const byte of randomBytes(need)) {
      if (byte >= limit) continue; // would bias the result, so throw it away
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === need) break;
    }
  }

  const parts = [];
  for (let i = 0; i < need; i += groupSize) {
    parts.push(out.slice(i, i + groupSize));
  }
  return parts.join("-");
}

/**
 * What shape is this stored value? Nothing here touches the password.
 *
 * Returns one of:
 *   "scrypt"        the current format, good
 *   "bcrypt"        an old raw $2b$ hash, still accepted
 *   "bcrypt-base64" an old base64-wrapped bcrypt hash, still accepted
 *   "bcrypt-cut"    a raw bcrypt hash the .env file ate part of
 *   "unreadable"    none of the above
 */
export function hashShape(value) {
  if (!value) return "unreadable";

  if (value.startsWith(`${PREFIX}.`)) {
    const parts = value.split(".");
    if (parts.length !== 6) return "unreadable";
    const [, cost, blockSize, parallel, salt, key] = parts;
    const numbersOk = [cost, blockSize, parallel].every((n) => /^[0-9]+$/.test(n));
    const hexOk = /^[0-9a-f]+$/.test(salt) && /^[0-9a-f]+$/.test(key);
    // EXACT lengths, not "at least". scrypt's short output is the start of its
    // long output, so a value with characters chopped off the end would still
    // match the right password. That would let a silently damaged value look
    // healthy. An `s1` value is always these lengths, so anything else is
    // damaged and must be refused.
    const lengthOk = salt.length === SALT_BYTES * 2 && key.length === KEY_BYTES * 2;
    return numbersOk && hexOk && lengthOk ? "scrypt" : "unreadable";
  }

  if (value.startsWith("$2")) {
    return value.length === 60 ? "bcrypt" : "bcrypt-cut";
  }

  // Might be base64 of a bcrypt hash. Decoding cannot throw here, so a
  // non-base64 string simply comes back as something that fails the test.
  const decoded = Buffer.from(value, "base64").toString("utf8");
  if (decoded.startsWith("$2") && decoded.length === 60) return "bcrypt-base64";

  return "unreadable";
}

/** True when this value can be checked against a password at all. */
export function isUsableHash(value) {
  const shape = hashShape(value);
  return shape === "scrypt" || shape === "bcrypt" || shape === "bcrypt-base64";
}

/**
 * Does this password match this stored value?
 *
 * Returns false for anything unreadable. A broken setting must never let
 * somebody in, and it must never throw either, because a thrown error inside a
 * sign-in turns into a blank 500 with no explanation.
 */
export async function verifyPassword(password, value) {
  const shape = hashShape(value);

  if (shape === "scrypt") {
    const [, cost, blockSize, parallel, saltHex, keyHex] = value.split(".");
    try {
      // Always ask for KEY_BYTES, never for whatever length the stored value
      // happens to be. See the note in hashShape about truncation.
      const derived = await scryptAsync(password, Buffer.from(saltHex, "hex"), KEY_BYTES, {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallel),
        maxmem: 256 * 1024 * 1024,
      });
      const expected = Buffer.from(keyHex, "hex");
      // Both buffers are the same length by construction, but check anyway:
      // timingSafeEqual throws on a length mismatch.
      if (derived.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(derived), expected);
    } catch {
      return false;
    }
  }

  if (shape === "bcrypt" || shape === "bcrypt-base64") {
    const hash =
      shape === "bcrypt" ? value : Buffer.from(value, "base64").toString("utf8");
    try {
      // Only loaded for an old value, so a fresh install never needs it.
      const { default: bcrypt } = await import("bcryptjs");
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  return false;
}

/** A sentence saying what is wrong with a stored value, or null when it is fine. */
export function hashProblem(value) {
  switch (hashShape(value)) {
    case "scrypt":
    case "bcrypt":
    case "bcrypt-base64":
      return null;
    case "bcrypt-cut":
      return (
        "the password value is an old-style hash that lost some characters. " +
        "Run npm run hash-password and use the new value."
      );
    default:
      return (
        "the password value cannot be read. Run npm run hash-password and " +
        "paste only the value it prints: no name in front, no quotes."
      );
  }
}
