import { COMMITTEES, type Submission } from "./form-schema";
import { IntegrationError } from "./mailerlite";
import { formatUsPhoneDisplay } from "./phone";

const TIMEOUT_MS = 10_000;

function baseUrl(): string {
  return process.env.MAILGUN_REGION?.trim().toLowerCase() === "eu"
    ? "https://api.eu.mailgun.net"
    : "https://api.mailgun.net";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const yesNo = (value: "yes" | "no") => (value === "yes" ? "Yes" : "No");

/**
 * Presence of the API key means "this deployment intends to send mail".
 * A key with MAILGUN_DOMAIN or NOTIFY_TO missing is a misconfiguration, not an
 * opt-out — `sendNotification` throws loudly for that case rather than
 * silently skipping.
 */
export function isMailgunConfigured(): boolean {
  return Boolean(process.env.MAILGUN_API_KEY?.trim());
}

type Row = { label: string; value: string };

function rows(submission: Submission): Row[] {
  const list: Row[] = [
    { label: "Name", value: submission.name },
    // Stored as E.164; shown to the human doing follow-up as (605) 555-0123.
    { label: "Phone", value: formatUsPhoneDisplay(submission.phone) },
    { label: "Email", value: submission.email },
    { label: "Union member", value: yesNo(submission.unionMember) },
  ];

  if (submission.unionMember === "yes") {
    list.push({ label: "Which union", value: submission.unionName });
  }

  list.push({
    label: "Retired union member",
    value: yesNo(submission.retiredUnionMember),
  });
  list.push({
    label: "Org/business partner interest",
    value: yesNo(submission.partnerOrg),
  });

  if (submission.partnerOrg === "yes") {
    list.push({
      label: "Which organization",
      value: submission.partnerOrgName,
    });
  }

  list.push({
    label: "Interested in volunteering",
    value: yesNo(submission.volunteer),
  });
  list.push({
    label: "Committees",
    value:
      submission.committees.length > 0
        ? // Report in the canonical order, not the order they were clicked.
          COMMITTEES.filter((c) => submission.committees.includes(c)).join(", ")
        : "None selected",
  });
  list.push({
    label: "Anything else",
    value: submission.notes || "—",
  });

  return list;
}

function textBody(submission: Submission): string {
  return [
    "New submission from the SFRLF get-involved form.",
    "",
    ...rows(submission).map((row) => `${row.label}: ${row.value}`),
    "",
    `Reply directly to this email to reach ${submission.name}.`,
  ].join("\n");
}

function htmlBody(submission: Submission): string {
  const cells = rows(submission)
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 16px 8px 0;vertical-align:top;color:#6b5a2a;font-size:13px;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;vertical-align:top;color:#110158;font-size:15px;">${escapeHtml(row.value).replace(/\n/g, "<br>")}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4ecd6;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:640px;margin:0 auto;background:#fffdf6;border:1px solid #e2d7bd;border-radius:16px;overflow:hidden;">
      <div style="background:#110158;padding:20px 28px;">
        <div style="color:#f4c352;font-size:20px;font-weight:bold;letter-spacing:.02em;">SFRLF</div>
        <div style="color:#cdc3c0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">New get-involved submission</div>
      </div>
      <div style="padding:24px 28px;">
        <table style="width:100%;border-collapse:collapse;">${cells}</table>
        <p style="margin:24px 0 0;color:#6b5a2a;font-size:13px;">
          Reply directly to this email to reach ${escapeHtml(submission.name)}.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Notify the follow-up recipient. Reply-To is the submitter, so hitting reply
 * in any mail client starts the follow-up conversation with them directly.
 */
export async function sendNotification(submission: Submission): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const to = process.env.NOTIFY_TO?.trim();
  const from =
    process.env.NOTIFY_FROM?.trim() ||
    (domain ? `SFRLF Website <forms@${domain}>` : "");

  const missing = [
    !apiKey && "MAILGUN_API_KEY",
    !domain && "MAILGUN_DOMAIN",
    !to && "NOTIFY_TO",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new IntegrationError(
      "mailgun",
      `Missing config: ${missing.join(", ")}.`,
    );
  }

  const body = new URLSearchParams({
    from,
    to: to!,
    subject: `New SFRLF form submission — ${submission.name}`,
    text: textBody(submission),
    html: htmlBody(submission),
    "h:Reply-To": submission.email,
  });

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new IntegrationError(
      "mailgun",
      `Request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new IntegrationError(
      "mailgun",
      `Responded ${response.status}: ${detail.slice(0, 500)}`,
      response.status,
    );
  }
}
