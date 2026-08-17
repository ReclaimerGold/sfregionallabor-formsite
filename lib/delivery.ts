/**
 * Decides whether a submission was actually recorded anywhere.
 *
 * Both integrations are optional-ish: MailerLite can be left unconfigured
 * entirely, and a deployment might run notification-only. That makes one rule
 * load-bearing —
 *
 *   a submission is accepted if and only if at least one *configured*
 *   destination recorded it; "skipped" never counts as a success.
 *
 * Get that wrong and an unconfigured MailerLite reads as a success, so a
 * Mailgun outage returns 200 to the submitter while the data goes nowhere.
 *
 * Dependency-free on purpose so it can be compiled and unit-tested on its own.
 */

export type DeliveryStatus = "delivered" | "skipped" | "failed";

export type DeliveryOutcome = {
  service: string;
  status: DeliveryStatus;
};

export type DeliveryVerdict = {
  outcomes: DeliveryOutcome[];
  /** True when at least one configured destination recorded the submission. */
  accepted: boolean;
  reason: "delivered" | "all-failed" | "none-configured";
};

export function summarizeDelivery(
  tasks: { service: string; enabled: boolean }[],
  settled: ("fulfilled" | "rejected")[],
): DeliveryVerdict {
  const outcomes: DeliveryOutcome[] = tasks.map((task, index) => {
    if (!task.enabled) return { service: task.service, status: "skipped" };
    return {
      service: task.service,
      status: settled[index] === "fulfilled" ? "delivered" : "failed",
    };
  });

  const accepted = outcomes.some((o) => o.status === "delivered");
  const anyConfigured = outcomes.some((o) => o.status !== "skipped");

  return {
    outcomes,
    accepted,
    reason: accepted
      ? "delivered"
      : anyConfigured
        ? "all-failed"
        : "none-configured",
  };
}
