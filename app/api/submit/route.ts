import { NextResponse } from "next/server";
import {
  HONEYPOT_FIELD,
  normalizeDraft,
  submissionSchema,
  toFieldErrors,
} from "@/lib/form-schema";
import { summarizeDelivery } from "@/lib/delivery";
import { isMailerLiteConfigured, upsertSubscriber } from "@/lib/mailerlite";
import { isMailgunConfigured, sendNotification } from "@/lib/mailgun";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

// Buffer (Mailgun basic auth) requires the Node runtime, not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request." },
      { status: 400 },
    );
  }

  // Honeypot: pretend it worked so bots don't learn what tripped them.
  const honeypot = (payload as Record<string, unknown> | null)?.[
    HONEYPOT_FIELD
  ];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const parsed = submissionSchema.safeParse(normalizeDraft(payload));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the highlighted fields.",
        fieldErrors: toFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const submission = parsed.data;

  // Each integration is independent and optional. An unconfigured one is
  // skipped rather than failed — but a skip is NOT a success, so it can never
  // mask the other one going down. See lib/delivery.ts for the rule.
  const tasks = [
    {
      service: "mailerlite",
      enabled: isMailerLiteConfigured(),
      run: () => upsertSubscriber(submission),
    },
    {
      service: "mailgun",
      enabled: isMailgunConfigured(),
      run: () => sendNotification(submission),
    },
  ];

  const settled = await Promise.allSettled(
    tasks.map((task) => (task.enabled ? task.run() : Promise.resolve())),
  );

  settled.forEach((result, index) => {
    if (tasks[index].enabled && result.status === "rejected") {
      console.error(`[submit] ${tasks[index].service} failed:`, result.reason);
    }
  });

  const verdict = summarizeDelivery(
    tasks.map(({ service, enabled }) => ({ service, enabled })),
    settled.map((result) => result.status),
  );

  if (!verdict.accepted) {
    console.error(
      verdict.reason === "none-configured"
        ? "[submit] no integration is configured — the submission had nowhere to go. Set MAILGUN_API_KEY and/or MAILERLITE_API_KEY."
        : "[submit] every configured integration failed; submission not recorded.",
      verdict.outcomes,
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't record your submission. Please try again in a moment, or email us directly.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    // Surfaced for logs/monitoring, not shown to the submitter.
    delivered: Object.fromEntries(
      verdict.outcomes.map((o) => [o.service, o.status]),
    ),
  });
}
