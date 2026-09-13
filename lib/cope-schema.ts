import { z } from "zod";
import { YES_NO, type YesNo } from "./form-schema";
import { isValidUsPhone, toE164 } from "./phone";

/**
 * Shape of the COPE Get Out the Vote volunteer signup (`/cope-gotv`).
 * Imported by both the client component and the API route so client and
 * server validation can never drift. Content follows COPE-GOTV-Signup-Form.docx.
 */

export const UNION_STATUS = [
  { value: "afl-cio", label: "Yes — my union is affiliated with the AFL-CIO" },
  {
    value: "not-afl-cio",
    label: "Yes — my union is not affiliated with the AFL-CIO",
  },
  {
    value: "unsure",
    label: "Yes — but I’m not sure whether we’re AFL-CIO affiliated",
  },
  { value: "no", label: "No — I’m not a union member" },
] as const;

export type UnionStatus = (typeof UNION_STATUS)[number]["value"];
const UNION_STATUS_VALUES = UNION_STATUS.map((o) => o.value) as [
  UnionStatus,
  ...UnionStatus[],
];

export const isUnionMember = (status: UnionStatus | "") =>
  status !== "" && status !== "no";

export const VOTER_STATUS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "I’m not sure" },
] as const;

export type VoterStatus = (typeof VOTER_STATUS)[number]["value"];
const VOTER_STATUS_VALUES = VOTER_STATUS.map((o) => o.value) as [
  VoterStatus,
  ...VoterStatus[],
];

/** Anyone not certain they're registered gets the registration help. */
export const needsRegistrationHelp = (status: VoterStatus | "") =>
  status === "no" || status === "unsure";

export const ACTIVITIES = [
  "Knocking doors",
  "Phone banking",
  "Text banking",
  "Writing postcards and letters",
  "Talking with my coworkers at my worksite",
  "Tabling at events, fairs, and union halls",
  "Driving voters to the polls",
  "Greeting voters at the polls on election day",
  "Hosting a house meeting or candidate forum",
  "Data entry and behind-the-scenes support",
  "Social media and making content",
  "Food, childcare, or supplies for volunteer shifts",
] as const;

export type Activity = (typeof ACTIVITIES)[number];

export const BUSINESS_OFFERS = [
  "Putting out voter information or literature",
  "Hosting a voter registration table",
  "Hosting a forum, meeting, or candidate event",
  "Being a launch site for canvasses",
  "Donating food, space, or services for volunteer shifts",
] as const;

export type BusinessOffer = (typeof BUSINESS_OFFERS)[number];

export const VOTER_LINKS = {
  registrationForm:
    "https://sdsos.gov/elections-voting/voting/register-to-vote/forms.aspx",
  voterPortal: "https://vip.sdsos.gov/",
} as const;

export const COPE_NOTES_MAX = 1000;
export const COPE_IDEA_MAX = 1000;

/** Same honeypot name as the get-involved form; bots don't get a new hint. */
export { HONEYPOT_FIELD } from "./form-schema";

const optionalText = (max: number, what: string) =>
  z.string().max(max, `Please keep ${what} under ${max} characters.`).default("");

/** A Yes/No that may be left unanswered. */
const optionalYesNo = z
  .union([z.enum(YES_NO), z.literal("")])
  .default("");

export const copeSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "Please enter your first name.")
      .max(80, "Please keep your first name under 80 characters."),
    lastName: z
      .string()
      .min(1, "Please enter your last name.")
      .max(80, "Please keep your last name under 80 characters."),
    email: z
      .email("Please enter a valid email address.")
      .max(200, "That email address looks too long."),
    // Optional here, unlike the get-involved form — but if given it has to be
    // a real number, and it's stored as E.164 like everywhere else.
    phone: z
      .string()
      .max(40, "That phone number looks too long.")
      .default("")
      .refine(
        (value) => value === "" || isValidUsPhone(value),
        "Please enter a valid 10-digit US phone number.",
      )
      .transform((value) => (value === "" ? "" : (toE164(value) ?? value))),
    street: optionalText(160, "the street address"),
    city: optionalText(80, "the city"),
    state: optionalText(40, "the state"),
    zip: z
      .string()
      .max(10, "That ZIP code looks too long.")
      .default("")
      .refine(
        (value) => value === "" || /^\d{5}(-\d{4})?$/.test(value),
        "Please enter a 5-digit ZIP code.",
      ),
    unionStatus: z.enum(UNION_STATUS_VALUES, {
      error: "Please tell us whether you’re a union member.",
    }),
    unionLocal: optionalText(160, "the union and local"),
    workplace: optionalText(160, "the workplace"),
    voterStatus: z.enum(VOTER_STATUS_VALUES, {
      error: "Please tell us whether you’re registered to vote.",
    }),
    registrationHelp: z.boolean().default(false),
    legislativeDistrict: optionalText(40, "the district"),
    activities: z.array(z.enum(ACTIVITIES)).default([]),
    creativeIdea: optionalYesNo,
    creativeIdeaDetails: optionalText(COPE_IDEA_MAX, "this"),
    business: optionalYesNo,
    businessName: optionalText(160, "the name"),
    businessLocation: optionalText(160, "the location"),
    businessOffers: z.array(z.enum(BUSINESS_OFFERS)).default([]),
    notes: optionalText(COPE_NOTES_MAX, "this"),
    smsConsent: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.creativeIdea === "yes" && value.creativeIdeaDetails.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["creativeIdeaDetails"],
        message: "Tell us a little about your idea.",
      });
    }
    if (value.business === "yes" && value.businessName.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["businessName"],
        message: "Please tell us the name of the business or space.",
      });
    }
  });

export type CopeSubmission = z.infer<typeof copeSchema>;

/** Shape the client holds in state before validation. */
export type CopeDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  unionStatus: UnionStatus | "";
  unionLocal: string;
  workplace: string;
  voterStatus: VoterStatus | "";
  registrationHelp: boolean;
  legislativeDistrict: string;
  activities: Activity[];
  creativeIdea: YesNo | "";
  creativeIdeaDetails: string;
  business: YesNo | "";
  businessName: string;
  businessLocation: string;
  businessOffers: BusinessOffer[];
  notes: string;
  smsConsent: boolean;
};

export const emptyCopeDraft: CopeDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "SD",
  zip: "",
  unionStatus: "",
  unionLocal: "",
  workplace: "",
  voterStatus: "",
  registrationHelp: false,
  legislativeDistrict: "",
  activities: [],
  creativeIdea: "",
  creativeIdeaDetails: "",
  business: "",
  businessName: "",
  businessLocation: "",
  businessOffers: [],
  notes: "",
  smsConsent: false,
};

export type CopeFieldErrors = Partial<Record<keyof CopeDraft, string>>;

/**
 * Conditional answers are cleared when they no longer apply, so someone who
 * picks "Yes", types an answer, then switches to "No" doesn't send a stale value.
 */
export function prepareCopeForSubmit(draft: CopeDraft): CopeDraft {
  const member = isUnionMember(draft.unionStatus);
  const helpApplies = needsRegistrationHelp(draft.voterStatus);
  return {
    ...draft,
    unionLocal: member ? draft.unionLocal : "",
    workplace: member ? draft.workplace : "",
    registrationHelp: helpApplies ? draft.registrationHelp : false,
    creativeIdeaDetails:
      draft.creativeIdea === "yes" ? draft.creativeIdeaDetails : "",
    businessName: draft.business === "yes" ? draft.businessName : "",
    businessLocation: draft.business === "yes" ? draft.businessLocation : "",
    businessOffers: draft.business === "yes" ? draft.businessOffers : [],
  };
}
