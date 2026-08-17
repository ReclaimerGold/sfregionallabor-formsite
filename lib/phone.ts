/**
 * US / NANP phone handling, shared by the input, the Zod schema, and the
 * notification email so all three agree on what a valid number looks like.
 *
 * A leading "1" is always treated as the country code — no NANP area code
 * starts with 1, so there's no ambiguity to resolve.
 */

export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Parses only — deliberately does NOT truncate. Overlong input has to stay
 * visible here so validation can reject it; if this capped at 10 digits,
 * a posted "605555012345" would silently become a valid-looking (605) 555-0123.
 * Truncation belongs to the display formatter, which caps as you type.
 */
export function splitUsDigits(value: string): {
  country: string;
  national: string;
} {
  let digits = digitsOf(value);
  let country = "";
  if (digits.startsWith("1")) {
    country = "1";
    digits = digits.slice(1);
  }
  return { country, national: digits };
}

/**
 * NANP rules: area code and exchange code both start 2–9. Catches transposed
 * or made-up numbers like (123) 456-7890 that a length check alone lets past.
 */
export function isValidUsPhone(value: string): boolean {
  const { national } = splitUsDigits(value);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(national);
}

/** Storage format: +16055550123. Returns null when the number isn't valid. */
export function toE164(value: string): string | null {
  if (!isValidUsPhone(value)) return null;
  return `+1${splitUsDigits(value).national}`;
}

/** Human-readable form for the notification email: (605) 555-0123 */
export function formatUsPhoneDisplay(value: string): string {
  const { national } = splitUsDigits(value);
  if (national.length !== 10) return value;
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

/**
 * Progressive format for what the user sees while typing. Punctuation appears
 * only once the digit that needs it has been entered, so nothing is ever
 * inserted ahead of the caret:
 *
 *   6           → (6
 *   605         → (605
 *   6055        → (605) 5
 *   6055550     → (605) 555-0
 *   6055550123  → (605) 555-0123
 *   16055550123 → +1 (605) 555-0123
 */
export function formatUsPhoneInput(value: string): string {
  const { country, national: parsed } = splitUsDigits(value);
  // Typing past a full number does nothing rather than showing a broken tail.
  const national = parsed.slice(0, 10);
  const prefix = country ? "+1 " : "";

  if (national.length === 0) return prefix;
  if (national.length <= 3) return `${prefix}(${national}`;
  if (national.length <= 6) {
    return `${prefix}(${national.slice(0, 3)}) ${national.slice(3)}`;
  }
  return `${prefix}(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

/**
 * The whole input behaviour as one pure function: given what was in the box,
 * what the browser just put there, and where the caret is, decide the value to
 * show and where the caret should land.
 *
 * Kept out of the component so it can be tested without a DOM.
 */
export function nextPhoneInputState(args: {
  /** Value currently in React state, before this keystroke. */
  previous: string;
  /** Raw value the browser produced. */
  raw: string;
  /** Caret offset within `raw`. */
  caret: number;
  /** `event.nativeEvent.inputType`, when the browser provides one. */
  inputType?: string;
}): { value: string; caret: number } {
  let digits = digitsOf(args.raw);
  let digitsBeforeCaret = digitsOf(args.raw.slice(0, args.caret)).length;

  // Backspace landed on a separator, so no digit was actually removed. Remove
  // the digit in front of it instead — otherwise the key is a silent no-op and
  // the caret sits there refusing to move.
  if (
    args.inputType === "deleteContentBackward" &&
    digits.length === digitsOf(args.previous).length &&
    digitsBeforeCaret > 0
  ) {
    digits =
      digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
    digitsBeforeCaret -= 1;
  }

  const value = formatUsPhoneInput(digits);
  return { value, caret: caretAfterDigit(value, digitsBeforeCaret) };
}

/**
 * Index in `formatted` that sits just after its nth digit — used to put the
 * caret back where the user left it after reformatting.
 */
export function caretAfterDigit(formatted: string, digitIndex: number): number {
  if (digitIndex >= digitsOf(formatted).length) return formatted.length;
  if (digitIndex <= 0) {
    const first = formatted.search(/\d/);
    return first === -1 ? formatted.length : first;
  }

  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted[i] >= "0" && formatted[i] <= "9") {
      seen += 1;
      if (seen === digitIndex) return i + 1;
    }
  }
  return formatted.length;
}
