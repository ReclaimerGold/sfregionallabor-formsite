import { summarizeDelivery } from "../.test-tmp/delivery.js";

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) pass += 1;
  else {
    fail += 1;
    console.log(`  ✗ ${label}\n      got:      ${a}\n      expected: ${e}`);
  }
};

const ml = (enabled) => ({ service: "mailerlite", enabled });
const mg = (enabled) => ({ service: "mailgun", enabled });

console.log("1. Both configured");
check(
  "both succeed -> accepted",
  summarizeDelivery([ml(true), mg(true)], ["fulfilled", "fulfilled"]).accepted,
  true,
);
check(
  "one fails -> still accepted (the other recorded it)",
  summarizeDelivery([ml(true), mg(true)], ["rejected", "fulfilled"]).accepted,
  true,
);
check(
  "both fail -> rejected",
  summarizeDelivery([ml(true), mg(true)], ["rejected", "rejected"]).accepted,
  false,
);
check(
  "both fail -> reason",
  summarizeDelivery([ml(true), mg(true)], ["rejected", "rejected"]).reason,
  "all-failed",
);

console.log("2. MailerLite left unconfigured (notification-only deployment)");
check(
  "skipped + mailgun delivered -> accepted",
  summarizeDelivery([ml(false), mg(true)], ["fulfilled", "fulfilled"]).accepted,
  true,
);
check(
  "skipped is reported as skipped, not delivered",
  summarizeDelivery([ml(false), mg(true)], ["fulfilled", "fulfilled"]).outcomes,
  [
    { service: "mailerlite", status: "skipped" },
    { service: "mailgun", status: "delivered" },
  ],
);
// The regression this whole module exists for: a skip must never stand in for
// a success, or a Mailgun outage silently swallows the submission.
check(
  "skipped + mailgun FAILED -> rejected, not a false success",
  summarizeDelivery([ml(false), mg(true)], ["fulfilled", "rejected"]).accepted,
  false,
);
check(
  "skipped + mailgun failed -> reason is all-failed",
  summarizeDelivery([ml(false), mg(true)], ["fulfilled", "rejected"]).reason,
  "all-failed",
);

console.log("3. Mailgun left unconfigured (MailerLite-only deployment)");
check(
  "mailerlite delivered + skipped -> accepted",
  summarizeDelivery([ml(true), mg(false)], ["fulfilled", "fulfilled"]).accepted,
  true,
);
check(
  "mailerlite FAILED + skipped -> rejected",
  summarizeDelivery([ml(true), mg(false)], ["rejected", "fulfilled"]).accepted,
  false,
);

console.log("4. Nothing configured at all");
const empty = summarizeDelivery([ml(false), mg(false)], [
  "fulfilled",
  "fulfilled",
]);
check("not accepted", empty.accepted, false);
check("reason distinguishes misconfiguration", empty.reason, "none-configured");
check("every outcome is skipped", empty.outcomes, [
  { service: "mailerlite", status: "skipped" },
  { service: "mailgun", status: "skipped" },
]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
