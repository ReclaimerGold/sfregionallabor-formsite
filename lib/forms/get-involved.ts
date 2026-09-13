import { COMMITTEES, submissionSchema, type Submission } from "../form-schema";
import { groupIdsFromEnv, yesNo, type SubscriberPayload } from "../mailerlite";
import type { NotificationPayload, Row } from "../mailgun";
import { formatUsPhoneDisplay } from "../phone";
import type { FormDefinition } from "../submit-pipeline";

/** How the get-involved form (`/`) lands in MailerLite and the inbox. */

function toSubscriber(submission: Submission): SubscriberPayload {
  return {
    email: submission.email,
    fields: {
      name: submission.name,
      phone: submission.phone,
      union_member: yesNo(submission.unionMember),
      union_name: submission.unionName,
      retired_union_member: yesNo(submission.retiredUnionMember),
      partner_org: yesNo(submission.partnerOrg),
      partner_org_name: submission.partnerOrgName,
      volunteer: yesNo(submission.volunteer),
      committees: submission.committees.join(", "),
      notes: submission.notes,
      signup_source: "Website get-involved form",
    },
    // Volunteers optionally get a second group.
    groups: groupIdsFromEnv(
      "MAILERLITE_GROUP_ID",
      ...(submission.volunteer === "yes"
        ? ["MAILERLITE_VOLUNTEER_GROUP_ID"]
        : []),
    ),
  };
}

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

function toNotification(submission: Submission): NotificationPayload {
  return {
    subject: `New SFRLF form submission — ${submission.name}`,
    heading: "New get-involved submission",
    intro: "New submission from the SFRLF get-involved form.",
    rows: rows(submission),
    submitter: { name: submission.name, email: submission.email },
  };
}

export const getInvolvedForm: FormDefinition<Submission> = {
  name: "submit",
  schema: submissionSchema,
  toSubscriber,
  toNotification,
};
