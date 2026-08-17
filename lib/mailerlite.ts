import fieldConfig from "@/config/mailerlite-fields.json";
import type { Submission } from "./form-schema";

const API_BASE = "https://connect.mailerlite.com/api";
const TIMEOUT_MS = 10_000;

const DECLARED_KEYS = new Set(fieldConfig.fields.map((field) => field.key));

export class IntegrationError extends Error {
  readonly service: string;
  readonly status?: number;

  constructor(service: string, message: string, status?: number) {
    super(message);
    this.name = "IntegrationError";
    this.service = service;
    this.status = status;
  }
}

const yesNo = (value: "yes" | "no") => (value === "yes" ? "Yes" : "No");

/**
 * MailerLite is opt-in. No API key means the deployment simply isn't using it,
 * which is a supported mode — not an error to log on every submission.
 * A key that's present but broken still fails loudly.
 */
export function isMailerLiteConfigured(): boolean {
  return Boolean(process.env.MAILERLITE_API_KEY?.trim());
}

/**
 * MailerLite's built-in fields are `name` and `phone`; everything else must
 * exist as a custom field first (see config/mailerlite-fields.json and
 * `npm run setup:mailerlite`). Unknown keys are silently dropped by MailerLite,
 * so we assert ours are declared rather than losing data quietly.
 */
export function buildFields(submission: Submission): Record<string, string> {
  const custom: Record<string, string> = {
    union_member: yesNo(submission.unionMember),
    union_name: submission.unionName,
    retired_union_member: yesNo(submission.retiredUnionMember),
    partner_org: yesNo(submission.partnerOrg),
    partner_org_name: submission.partnerOrgName,
    volunteer: yesNo(submission.volunteer),
    committees: submission.committees.join(", "),
    notes: submission.notes,
    signup_source: "Website get-involved form",
  };

  const undeclared = Object.keys(custom).filter((key) => !DECLARED_KEYS.has(key));
  if (undeclared.length > 0) {
    throw new Error(
      `MailerLite field(s) not declared in config/mailerlite-fields.json: ${undeclared.join(", ")}`,
    );
  }

  return {
    name: submission.name,
    phone: submission.phone,
    ...custom,
  };
}

/** Group IDs to add this subscriber to. Volunteers optionally get a second group. */
function resolveGroups(submission: Submission): string[] {
  const groups = [process.env.MAILERLITE_GROUP_ID];
  if (submission.volunteer === "yes") {
    groups.push(process.env.MAILERLITE_VOLUNTEER_GROUP_ID);
  }
  return groups
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id));
}

/**
 * Create or update the subscriber. MailerLite upserts on email: 201 for a new
 * subscriber, 200 for an existing one. Groups are additive — an existing
 * subscriber is never removed from groups they're already in.
 */
export async function upsertSubscriber(submission: Submission): Promise<void> {
  const apiKey = process.env.MAILERLITE_API_KEY?.trim();
  if (!apiKey) {
    throw new IntegrationError("mailerlite", "MAILERLITE_API_KEY is not set.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: submission.email,
        fields: buildFields(submission),
        groups: resolveGroups(submission),
        status: "active",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new IntegrationError(
      "mailerlite",
      `Request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new IntegrationError(
      "mailerlite",
      `Responded ${response.status}: ${detail.slice(0, 500)}`,
      response.status,
    );
  }
}
