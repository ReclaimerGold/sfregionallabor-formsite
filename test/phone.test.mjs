import {
  formatUsPhoneInput,
  formatUsPhoneDisplay,
  isValidUsPhone,
  toE164,
  nextPhoneInputState,
} from "../.test-tmp/phone.js";

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (ok) pass += 1;
  else fail += 1;
  if (!ok) console.log(`  ✗ ${label}\n      got:      ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(expected)}`);
};

/** Simulate a person typing one character at a time into a real input. */
function type(chars, start = { value: "", caret: 0 }) {
  let state = start;
  const frames = [];
  for (const ch of chars) {
    const raw =
      state.value.slice(0, state.caret) + ch + state.value.slice(state.caret);
    state = nextPhoneInputState({
      previous: state.value,
      raw,
      caret: state.caret + 1,
      inputType: "insertText",
    });
    frames.push(state.value);
  }
  return { state, frames };
}

/** Simulate pressing Backspace once. */
function backspace(state) {
  if (state.caret === 0) return state;
  const raw = state.value.slice(0, state.caret - 1) + state.value.slice(state.caret);
  return nextPhoneInputState({
    previous: state.value,
    raw,
    caret: state.caret - 1,
    inputType: "deleteContentBackward",
  });
}

console.log("1. Progressive formatting while typing 6055550123");
const typed = type("6055550123");
const expectedFrames = [
  "(6", "(60", "(605", "(605) 5", "(605) 55",
  "(605) 555", "(605) 555-0", "(605) 555-01", "(605) 555-012", "(605) 555-0123",
];
expectedFrames.forEach((exp, i) => check(`keystroke ${i + 1}`, typed.frames[i], exp));
check("caret parks at end", typed.state.caret, "(605) 555-0123".length);

console.log("2. Typing with a leading country code");
const withCc = type("16055550123");
check("leading 1 becomes +1", withCc.frames[0], "+1 ");
check("full 11-digit result", withCc.state.value, "+1 (605) 555-0123");

console.log("3. Extra digits past 10 are ignored");
check("overflow", type("60555501239999").state.value, "(605) 555-0123");

console.log("4. Pasting messy input");
const pastes = [
  ["605.555.0123", "(605) 555-0123"],
  ["605-555-0123", "(605) 555-0123"],
  ["605 555 0123", "(605) 555-0123"],
  ["+1 (605) 555-0123", "+1 (605) 555-0123"],
  ["1-605-555-0123", "+1 (605) 555-0123"],
  ["(605)5550123", "(605) 555-0123"],
];
for (const [input, expected] of pastes) check(`paste ${input}`, formatUsPhoneInput(input), expected);

console.log("5. Backspace over a separator still deletes a digit");
let st = type("6055550123").state;              // "(605) 555-0123"
st = backspace(st); check("del 1", st.value, "(605) 555-012");
st = backspace(st); check("del 2", st.value, "(605) 555-01");
st = backspace(st); check("del 3", st.value, "(605) 555-0");
st = backspace(st); check("del 4 (over the dash)", st.value, "(605) 555");
st = backspace(st); check("del 5", st.value, "(605) 55");
st = backspace(st); check("del 6", st.value, "(605) 5");
st = backspace(st); check("del 7 (over the space)", st.value, "(605");
st = backspace(st); check("del 8", st.value, "(60");
st = backspace(st); check("del 9", st.value, "(6");
st = backspace(st); check("del 10 (empty)", st.value, "");
st = backspace(st); check("backspace on empty is safe", st.value, "");

console.log("6. Backspace never stalls (each press removes exactly one digit)");
let s2 = type("6055550123").state;
for (let i = 10; i > 0; i -= 1) {
  const before = s2.value.replace(/\D/g, "").length;
  s2 = backspace(s2);
  const after = s2.value.replace(/\D/g, "").length;
  check(`press at ${before} digits removes one`, after, before - 1);
}

console.log("7. Editing mid-string keeps the caret on the right digit");
// Caret sits right after the area code "605"; typing "9" should give 9605...
const mid = nextPhoneInputState({
  previous: "(605) 555-0123",
  raw: "(9605) 555-0123",
  caret: 2,
  inputType: "insertText",
});
// 9 is not a country code, so this is a plain 10-digit number and the trailing
// "3" falls off the end.
check("mid-string insert value", mid.value, "(960) 555-5012");
check("mid-string caret sits just after the typed digit", mid.caret, 2);

console.log("8. Validation (NANP rules)");
const valid = ["6055550123", "(605) 555-0123", "+1 605 555 0123", "1-605-555-0123", "605.555.0123"];
const invalid = ["", "605555012", "12345", "(123) 456-7890", "(605) 155-0123", "0055550123", "605555012345"];
for (const v of valid) check(`valid: ${v}`, isValidUsPhone(v), true);
for (const v of invalid) check(`invalid: ${v}`, isValidUsPhone(v), false);

console.log("9. E.164 storage + idempotency");
check("to E.164", toE164("(605) 555-0123"), "+16055550123");
check("no country code needed", toE164("6055550123"), "+16055550123");
check("re-validating E.164 passes", isValidUsPhone("+16055550123"), true);
check("E.164 round-trips", toE164(toE164("6055550123")), "+16055550123");
check("invalid returns null", toE164("12345"), null);

console.log("10. Display format for the notification email");
check("E.164 to display", formatUsPhoneDisplay("+16055550123"), "(605) 555-0123");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
