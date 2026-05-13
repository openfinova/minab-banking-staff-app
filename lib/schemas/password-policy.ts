import { z } from "zod";

/** Length bounds aligned with identity `PasswordPolicyProperties` defaults and password DTOs. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** Charset for generated passwords (each char is non-alphanumeric in Java `Character` sense). */
const SPECIAL_CHARS = "!@#$%^&*-_+=[]{}";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";

function pickCharUnbiased(pool: string): string {
  const n = pool.length;
  const max = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= max);
  return pool[x % n]!;
}

function randomIntBelow(exclusiveMax: number): number {
  const max = Math.floor(0x1_0000_0000 / exclusiveMax) * exclusiveMax;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= max);
  return x % exclusiveMax;
}

function shuffleChars(chars: string[]): void {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIntBelow(i + 1);
    const t = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = t;
  }
}

/**
 * Whether `pw` satisfies the default identity complexity rules (see `PasswordPolicyService` /
 * `PasswordPolicyProperties` when all four `require*` flags are true).
 */
export function passwordMeetsDefaultIdentityComplexity(pw: string): boolean {
  if (pw.length < PASSWORD_MIN_LENGTH || pw.length > PASSWORD_MAX_LENGTH) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (/^[A-Za-z0-9]+$/.test(pw)) return false;
  return true;
}

/**
 * Random password matching default banking identity policy (length + upper, lower, digit, special).
 *
 * @param length Total length; clamped to [{@link PASSWORD_MIN_LENGTH}, {@link PASSWORD_MAX_LENGTH}].
 */
export function generateBankCompliantPassword(length = 16): string {
  const len = Math.min(
    PASSWORD_MAX_LENGTH,
    Math.max(PASSWORD_MIN_LENGTH, Math.floor(length)),
  );
  const pool = UPPER + LOWER + DIGITS + SPECIAL_CHARS;
  const required = [
    pickCharUnbiased(UPPER),
    pickCharUnbiased(LOWER),
    pickCharUnbiased(DIGITS),
    pickCharUnbiased(SPECIAL_CHARS),
  ];
  while (required.length < len) {
    required.push(pickCharUnbiased(pool));
  }
  shuffleChars(required);
  return required.join("");
}

/** Plaintext rules for setting or changing passwords (length only; complexity is enforced server-side). */
export const bankPasswordStringSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
