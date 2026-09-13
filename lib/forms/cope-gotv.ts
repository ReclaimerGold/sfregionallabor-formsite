import {
  ACTIVITIES,
  BUSINESS_OFFERS,
  UNION_STATUS,
  VOTER_STATUS,
  copeSchema,
  isUnionMember,
  needsRegistrationHelp,
  type CopeSubmission,
} from "../cope-schema";
import {
  groupIdsFromEnv,
  yesNoBool,
  type SubscriberPayload,
} from "../mailerlite";
import type { NotificationPayload, Row } from "../mailgun";
import { formatUsPhoneDisplay } from "../phone";
import type { FormDefinition } from "../submit-pipeline";

/** How the COPE GOTV volunteer form (`/cope-gotv`) lands in MailerLite and the inbox. */

const optionLabel = <T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
) => options.find((option) => option.value === value)?.label ?? value;

/** "Yes" / "No" / "" — a Yes/No the submitter may have skipped. */
const maybeYesNo = (value: "yes" | "no" | "") =>
  value === "" ? "" : value === "yes" ? "Yes" : "No";

/** Report in the canonical order, not the order they were clicked. */
const inOrder = <T extends string>(all: readonly T[], chosen: readonly T[]) =>
  all.filter((item) => chosen.includes(item));

const fullName = (s: CopeSubmission) => `${s.firstName} ${s.lastName}`.trim();

function toSubscriber(s: CopeSubmission): SubscriberPayload {
  return {
    email: s.email,
    fields: {
      // Built-ins: name, last_name, phone, city, state, z_i_p.
      name: s.firstName,
      last_name: s.lastName,
      phone: s.phone,
      city: s.city,
      state: s.state,
      z_i_p: s.zip,
      street_address: s.street,
      cope_union_member: optionLabel(UNION_STATUS, s.unionStatus),
      cope_union_local: s.unionLocal,
      cope_workplace: s.workplace,
      cope_registered_to_vote: optionLabel(VOTER_STATUS, s.voterStatus),
      cope_registration_help: yesNoBool(s.registrationHelp),
      cope_legislative_district: s.legislativeDistrict,
      cope_activities: inOrder(ACTIVITIES, s.activities).join(", "),
      cope_creative_idea: maybeYesNo(s.creativeIdea),
      cope_creative_idea_details: s.creativeIdeaDetails,
      cope_business: maybeYesNo(s.business),
      cope_business_name: s.businessName,
      cope_business_location: s.businessLocation,
      cope_business_offers: inOrder(BUSINESS_OFFERS, s.businessOffers).join(
        ", ",
      ),
      cope_notes: s.notes,
      cope_sms_consent: yesNoBool(s.smsConsent),
      signup_source: "Website COPE GOTV volunteer form",
    },
    // A dedicated COPE group if one is configured, otherwise the general
    // signups group — never nowhere.
    groups: groupIdsFromEnv(
      process.env.MAILERLITE_COPE_GROUP_ID?.trim()
        ? "MAILERLITE_COPE_GROUP_ID"
        : "MAILERLITE_GROUP_ID",
    ),
  };
}

function rows(s: CopeSubmission): Row[] {
  const list: Row[] = [
    { label: "Name", value: fullName(s) },
    { label: "Email", value: s.email },
    // Stored as E.164; shown to the human doing follow-up as (605) 555-0123.
    { label: "Phone", value: s.phone ? formatUsPhoneDisplay(s.phone) : "—" },
    {
      label: "Address",
      value:
        [s.street, [s.city, s.state].filter(Boolean).join(", "), s.zip]
          .filter(Boolean)
          .join("\n") || "—",
    },
    { label: "Union member", value: optionLabel(UNION_STATUS, s.unionStatus) },
  ];

  if (isUnionMember(s.unionStatus)) {
    list.push({ label: "Union and local", value: s.unionLocal || "—" });
    list.push({ label: "Workplace", value: s.workplace || "—" });
  }

  list.push({
    label: "Registered to vote",
    value: optionLabel(VOTER_STATUS, s.voterStatus),
  });
  if (needsRegistrationHelp(s.voterStatus)) {
    list.push({
      label: "Wants registration help",
      value: yesNoBool(s.registrationHelp),
    });
  }

  list.push({
    label: "Legislative district",
    value: s.legislativeDistrict || "—",
  });
  list.push({
    label: "Wants to help by",
    value: inOrder(ACTIVITIES, s.activities).join(", ") || "None selected",
  });

  list.push({
    label: "Creative idea",
    value: maybeYesNo(s.creativeIdea) || "—",
  });
  if (s.creativeIdea === "yes") {
    list.push({ label: "The idea", value: s.creativeIdeaDetails });
  }

  list.push({
    label: "Runs a business / third space",
    value: maybeYesNo(s.business) || "—",
  });
  if (s.business === "yes") {
    list.push({ label: "Business or space", value: s.businessName });
    list.push({ label: "Where", value: s.businessLocation || "—" });
    list.push({
      label: "Open to",
      value:
        inOrder(BUSINESS_OFFERS, s.businessOffers).join(", ") ||
        "None selected",
    });
  }

  list.push({ label: "Anything else", value: s.notes || "—" });
  list.push({ label: "OK to text", value: yesNoBool(s.smsConsent) });

  return list;
}

function toNotification(s: CopeSubmission): NotificationPayload {
  const name = fullName(s);
  return {
    subject: `New COPE GOTV volunteer — ${name}`,
    heading: "New COPE GOTV volunteer signup",
    intro: "New volunteer signup from the SFRLF COPE Get Out the Vote form.",
    rows: rows(s),
    submitter: { name, email: s.email },
  };
}

export const copeGotvForm: FormDefinition<CopeSubmission> = {
  name: "cope-gotv",
  schema: copeSchema,
  toSubscriber,
  toNotification,
};
