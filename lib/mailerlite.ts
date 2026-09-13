import fieldConfig from "@/config/mailerlite-fields.json";

const API_BASE = "https://connect.mailerlite.com/api";
const TIMEOUT_MS = 10_000;

/**
 * Every key the forms may send — MailerLite's built-ins and our custom fields
 * alike (see config/mailerlite-fields.json and `npm run setup:mailerlite`).
 */
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

export const yesNo = (value: "yes" | "no") => (value === "yes" ? "Yes" : "No");
export const yesNoBool = (value: boolean) => (value ? "Yes" : "No");

/**
 * MailerLite is opt-in. No API key means the deployment simply isn't using it,
 * which is a supported mode — not an error to log on every submission.
 * A key that's present but broken still fails loudly.
 */
export function isMailerLiteConfigured(): boolean {
  return Boolean(process.env.MAILERLITE_API_KEY?.trim());
}

/**
 * MailerLite silently drops unknown field keys, so assert ours are declared
 * in the config rather than losing data quietly.
 */
export function assertDeclaredFields(fields: Record<string, string>): void {
  const undeclared = Object.keys(fields).filter(
    (key) => !DECLARED_KEYS.has(key),
  );
  if (undeclared.length > 0) {
    throw new Error(
      `MailerLite field(s) not declared in config/mailerlite-fields.json: ${undeclared.join(", ")}`,
    );
  }
}

/** Read group IDs from env, dropping any that are unset. */
export function groupIdsFromEnv(...names: string[]): string[] {
  return names
    .map((name) => process.env[name]?.trim())
    .filter((id): id is string => Boolean(id));
}

export type SubscriberPayload = {
  email: string;
  fields: Record<string, string>;
  groups: string[];
};

/**
 * Create or update the subscriber. MailerLite upserts on email: 201 for a new
 * subscriber, 200 for an existing one. Groups are additive — an existing
 * subscriber is never removed from groups they're already in.
 */
export async function upsertSubscriber(
  subscriber: SubscriberPayload,
): Promise<void> {
  const apiKey = process.env.MAILERLITE_API_KEY?.trim();
  if (!apiKey) {
    throw new IntegrationError("mailerlite", "MAILERLITE_API_KEY is not set.");
  }

  assertDeclaredFields(subscriber.fields);

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
        email: subscriber.email,
        fields: subscriber.fields,
        groups: subscriber.groups,
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
