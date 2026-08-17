import { z } from "zod";
import { isValidUsPhone, toE164 } from "./phone";

/**
 * Single source of truth for the form's shape. Imported by both the client
 * component and the API route so client and server validation can never drift.
 */

export const COMMITTEES = [
  "Organizing",
  "Legislative",
  "Education and Training",
  "Community Services",
  "Communications",
  "Events",
  "Young Workers",
] as const;

export type Committee = (typeof COMMITTEES)[number];

export const YES_NO = ["yes", "no"] as const;
export type YesNo = (typeof YES_NO)[number];

export const NOTES_MAX = 1000;

/** Name of the honeypot input. Real people never see it; bots fill it in. */
export const HONEYPOT_FIELD = "website";

const choose = (question: string) =>
  z.enum(YES_NO, { error: `Please choose Yes or No for "${question}".` });

export const submissionSchema = z
  .object({
    name: z
      .string()
      .min(1, "Please enter your name.")
      .max(120, "Please keep your name under 120 characters."),
    // Accepts whatever the user typed — "(605) 555-0123", "605-555-0123",
    // "+1 605 555 0123" — and stores the E.164 form so MailerLite always
    // receives one consistent shape. Idempotent: re-validating "+16055550123"
    // yields itself, so the server can re-check what the client sent.
    phone: z
      .string()
      .min(1, "Please enter a phone number.")
      .max(40, "That phone number looks too long.")
      .refine(isValidUsPhone, "Please enter a valid 10-digit US phone number.")
      .transform((value) => toE164(value) ?? value),
    email: z
      .email("Please enter a valid email address.")
      .max(200, "That email address looks too long."),
    unionMember: choose("Are you a union member?"),
    unionName: z
      .string()
      .max(160, "Please keep the union name under 160 characters.")
      .default(""),
    retiredUnionMember: choose("Are you a retired union member?"),
    partnerOrg: choose(
      "Are you part of an organization or business that would want to work with the labor federation?",
    ),
    partnerOrgName: z
      .string()
      .max(160, "Please keep the organization name under 160 characters.")
      .default(""),
    volunteer: choose("Are you interested in volunteering?"),
    committees: z.array(z.enum(COMMITTEES)).default([]),
    notes: z
      .string()
      .max(NOTES_MAX, `Please keep this under ${NOTES_MAX} characters.`)
      .default(""),
  })
  .superRefine((value, ctx) => {
    if (value.unionMember === "yes" && value.unionName.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["unionName"],
        message: "Please tell us which union.",
      });
    }
    if (value.partnerOrg === "yes" && value.partnerOrgName.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["partnerOrgName"],
        message: "Please tell us which organization or business.",
      });
    }
  });

export type Submission = z.infer<typeof submissionSchema>;

/** Shape the client posts (and holds in state) before validation. */
export type SubmissionDraft = {
  name: string;
  phone: string;
  email: string;
  unionMember: YesNo | "";
  unionName: string;
  retiredUnionMember: YesNo | "";
  partnerOrg: YesNo | "";
  partnerOrgName: string;
  volunteer: YesNo | "";
  committees: Committee[];
  notes: string;
};

export const emptyDraft: SubmissionDraft = {
  name: "",
  phone: "",
  email: "",
  unionMember: "",
  unionName: "",
  retiredUnionMember: "",
  partnerOrg: "",
  partnerOrgName: "",
  volunteer: "",
  committees: [],
  notes: "",
};

export type FieldErrors = Partial<Record<keyof SubmissionDraft, string>>;

/**
 * Trim every string before validation so `"  "` fails `min(1)` and stray
 * whitespace never reaches MailerLite.
 */
export function normalizeDraft(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string") {
      out[key] = value.trim();
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        typeof item === "string" ? item.trim() : item,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Collapse a ZodError into one message per field, keyed for the UI. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as keyof SubmissionDraft] = issue.message;
    }
  }
  return errors;
}

/**
 * Conditional answers are cleared when they no longer apply, so a submitter who
 * picks "Yes", types a union, then switches to "No" doesn't send a stale value.
 */
export function prepareForSubmit(draft: SubmissionDraft) {
  return {
    ...draft,
    unionName: draft.unionMember === "yes" ? draft.unionName : "",
    partnerOrgName: draft.partnerOrg === "yes" ? draft.partnerOrgName : "",
  };
}
