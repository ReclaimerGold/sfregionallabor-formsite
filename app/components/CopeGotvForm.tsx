"use client";

import { useId, useState } from "react";
import {
  ACTIVITIES,
  BUSINESS_OFFERS,
  COPE_IDEA_MAX,
  COPE_NOTES_MAX,
  HONEYPOT_FIELD,
  UNION_STATUS,
  VOTER_LINKS,
  VOTER_STATUS,
  copeSchema,
  emptyCopeDraft,
  isUnionMember,
  needsRegistrationHelp,
  prepareCopeForSubmit,
  type Activity,
  type BusinessOffer,
  type CopeDraft,
  type CopeFieldErrors,
} from "@/lib/cope-schema";
import { normalizeDraft, toFieldErrors } from "@/lib/form-schema";
import { nextPhoneInputState } from "@/lib/phone";
import {
  CheckboxChip,
  CheckboxChipGroup,
  FieldShell,
  FormErrorBanner,
  HoneypotField,
  RadioPillGroup,
  SectionHeading,
  SubmitButton,
  SuccessPanel,
  YesNoGroup,
  focusFirstError,
  formCardClass,
  inputClass,
  postSubmission,
} from "./form-ui";

const linkClass =
  "font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4 transition hover:text-brick";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );
}

/** Text fields that are all plain `<input>`s with the same wiring. */
type TextKey =
  | "firstName"
  | "lastName"
  | "email"
  | "street"
  | "city"
  | "state"
  | "zip"
  | "unionLocal"
  | "workplace"
  | "legislativeDistrict"
  | "businessName"
  | "businessLocation";

export default function CopeGotvForm() {
  const id = useId();
  const [draft, setDraft] = useState<CopeDraft>(emptyCopeDraft);
  const [errors, setErrors] = useState<CopeFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [honeypot, setHoneypot] = useState("");

  const set = <K extends keyof CopeDraft>(key: K, value: CopeDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const toggleIn = <K extends "activities" | "businessOffers">(
    key: K,
    item: CopeDraft[K][number],
  ) => {
    setDraft((current) => {
      const list = current[key] as string[];
      return {
        ...current,
        [key]: list.includes(item)
          ? list.filter((entry) => entry !== item)
          : [...list, item],
      };
    });
  };

  /** See SignUpForm.handlePhoneChange — keeps the caret put while formatting. */
  function handlePhoneChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const { value, caret } = nextPhoneInputState({
      previous: draft.phone,
      raw: input.value,
      caret: input.selectionStart ?? input.value.length,
      inputType: (event.nativeEvent as InputEvent).inputType,
    });
    input.value = value;
    input.setSelectionRange(caret, caret);
    set("phone", value);
  }

  const textInput = (
    key: TextKey,
    props: Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "id" | "value" | "onChange" | "className"
    > = {},
  ) => (
    <input
      id={`${id}-${key}`}
      type="text"
      value={draft[key]}
      onChange={(event) => set(key, event.target.value)}
      aria-invalid={Boolean(errors[key])}
      data-invalid={Boolean(errors[key])}
      className={inputClass(Boolean(errors[key]))}
      {...props}
    />
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const candidate = prepareCopeForSubmit(draft);
    const parsed = copeSchema.safeParse(normalizeDraft(candidate));

    if (!parsed.success) {
      setErrors(toFieldErrors<keyof CopeDraft>(parsed.error));
      setStatus("error");
      setFormError("Please check the highlighted fields.");
      focusFirstError();
      return;
    }

    setErrors({});
    setStatus("submitting");

    const result = await postSubmission("/api/cope-gotv", {
      ...parsed.data,
      [HONEYPOT_FIELD]: honeypot,
    });

    if (!result.ok) {
      setErrors((result.fieldErrors as CopeFieldErrors | undefined) ?? {});
      setFormError(result.error);
      setStatus("error");
      if (result.fieldErrors) focusFirstError();
      return;
    }

    setStatus("success");
    setDraft(emptyCopeDraft);
  }

  if (status === "success") {
    return (
      <SuccessPanel
        title="Thanks — you’re on the team."
        message="We’ve got your information. Someone from COPE will be in touch to get you plugged in."
        onReset={() => setStatus("idle")}
      />
    );
  }

  const submitting = status === "submitting";
  const member = isUnionMember(draft.unionStatus);
  const showRegistrationHelp = needsRegistrationHelp(draft.voterStatus);

  return (
    <form onSubmit={handleSubmit} noValidate className={formCardClass}>
      <HoneypotField
        id={`${id}-website`}
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={setHoneypot}
      />

      <div className="space-y-10">
        {/* Contact information */}
        <section className="space-y-6">
          <SectionHeading>Contact information</SectionHeading>

          <div className="grid gap-6 sm:grid-cols-2">
            <FieldShell
              label="First name"
              htmlFor={`${id}-firstName`}
              error={errors.firstName}
              required
            >
              {textInput("firstName", { autoComplete: "given-name" })}
            </FieldShell>
            <FieldShell
              label="Last name"
              htmlFor={`${id}-lastName`}
              error={errors.lastName}
              required
            >
              {textInput("lastName", { autoComplete: "family-name" })}
            </FieldShell>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FieldShell
              label="Email"
              htmlFor={`${id}-email`}
              error={errors.email}
              required
            >
              {textInput("email", {
                type: "email",
                inputMode: "email",
                autoComplete: "email",
                placeholder: "you@example.com",
              })}
            </FieldShell>
            <FieldShell
              label="Phone"
              htmlFor={`${id}-phone`}
              error={errors.phone}
            >
              <input
                id={`${id}-phone`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(605) 555-0123"
                value={draft.phone}
                onChange={handlePhoneChange}
                aria-invalid={Boolean(errors.phone)}
                data-invalid={Boolean(errors.phone)}
                className={inputClass(Boolean(errors.phone))}
              />
            </FieldShell>
          </div>

          <FieldShell
            label="Street address"
            htmlFor={`${id}-street`}
            error={errors.street}
          >
            {textInput("street", { autoComplete: "street-address" })}
          </FieldShell>

          <div className="grid gap-6 sm:grid-cols-[1fr_minmax(0,6rem)_minmax(0,9rem)]">
            <FieldShell label="City" htmlFor={`${id}-city`} error={errors.city}>
              {textInput("city", { autoComplete: "address-level2" })}
            </FieldShell>
            <FieldShell
              label="State"
              htmlFor={`${id}-state`}
              error={errors.state}
            >
              {textInput("state", { autoComplete: "address-level1" })}
            </FieldShell>
            <FieldShell
              label="ZIP code"
              htmlFor={`${id}-zip`}
              error={errors.zip}
            >
              {textInput("zip", {
                inputMode: "numeric",
                autoComplete: "postal-code",
                placeholder: "57104",
              })}
            </FieldShell>
          </div>
        </section>

        {/* Union membership */}
        <section className="space-y-6">
          <SectionHeading>Union membership</SectionHeading>

          <RadioPillGroup
            question="Are you a union member?"
            name={`${id}-unionStatus`}
            options={UNION_STATUS}
            value={draft.unionStatus}
            error={errors.unionStatus}
            hint="Pick one. You do not have to be a union member to volunteer."
            required
            layout="stack"
            onChange={(value) => set("unionStatus", value)}
          />

          {member && (
            <div className="grid gap-6 sm:grid-cols-2">
              <FieldShell
                label="Union and local number"
                htmlFor={`${id}-unionLocal`}
                error={errors.unionLocal}
              >
                {textInput("unionLocal", { placeholder: "e.g. IBEW Local 426" })}
              </FieldShell>
              <FieldShell
                label="Where do you work?"
                htmlFor={`${id}-workplace`}
                error={errors.workplace}
              >
                {textInput("workplace", { autoComplete: "organization" })}
              </FieldShell>
            </div>
          )}
        </section>

        {/* Voter registration */}
        <section className="space-y-6">
          <SectionHeading>Voting</SectionHeading>

          <RadioPillGroup
            question="Are you registered to vote?"
            name={`${id}-voterStatus`}
            options={VOTER_STATUS}
            value={draft.voterStatus}
            error={errors.voterStatus}
            required
            onChange={(value) => set("voterStatus", value)}
          />

          {showRegistrationHelp && (
            <div className="space-y-4 rounded-xl border-2 border-gold/60 bg-gold/10 p-5">
              <p className="text-navy">
                South Dakota does not register voters online. You print the
                form, sign it, and get it to your county auditor at least 15
                days before the election.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-navy">
                <li>
                  <ExternalLink href={VOTER_LINKS.registrationForm}>
                    Download the voter registration form
                  </ExternalLink>
                </li>
                <li>
                  <ExternalLink href={VOTER_LINKS.voterPortal}>
                    Check whether you&rsquo;re already registered
                  </ExternalLink>
                </li>
              </ul>
              <CheckboxChip
                label="Have someone help me get registered"
                checked={draft.registrationHelp}
                onChange={(checked) => set("registrationHelp", checked)}
              />
            </div>
          )}

          <FieldShell
            label="Legislative district, if you know it"
            htmlFor={`${id}-legislativeDistrict`}
            error={errors.legislativeDistrict}
            hint="Leave blank if you're not sure."
          >
            {textInput("legislativeDistrict", {
              inputMode: "numeric",
              placeholder: "e.g. 12",
            })}
            <p className="mt-2 text-sm text-ink">
              Don&rsquo;t know it? Look it up at the{" "}
              <ExternalLink href={VOTER_LINKS.voterPortal}>
                South Dakota Voter Information Portal
              </ExternalLink>{" "}
              — sign in with your name and date of birth and it will show your
              district and your polling place.
            </p>
          </FieldShell>
        </section>

        {/* How to help */}
        <section className="space-y-6">
          <SectionHeading>How do you want to help?</SectionHeading>

          <CheckboxChipGroup<Activity>
            question="Pick the ways you'd like to pitch in"
            options={ACTIVITIES}
            value={draft.activities}
            onToggle={(item) => toggleIn("activities", item)}
          />

          <YesNoGroup
            question="Do you have a creative idea you want to run?"
            name={`${id}-creativeIdea`}
            value={draft.creativeIdea}
            error={errors.creativeIdea}
            onChange={(value) => set("creativeIdea", value)}
          />

          {draft.creativeIdea === "yes" && (
            <FieldShell
              label="Tell us about it"
              htmlFor={`${id}-creativeIdeaDetails`}
              error={errors.creativeIdeaDetails}
            >
              <textarea
                id={`${id}-creativeIdeaDetails`}
                rows={4}
                maxLength={COPE_IDEA_MAX}
                value={draft.creativeIdeaDetails}
                onChange={(event) =>
                  set("creativeIdeaDetails", event.target.value)
                }
                aria-invalid={Boolean(errors.creativeIdeaDetails)}
                data-invalid={Boolean(errors.creativeIdeaDetails)}
                className={`${inputClass(Boolean(errors.creativeIdeaDetails))} resize-y`}
              />
              <p className="mt-1 text-right text-xs text-ink">
                {draft.creativeIdeaDetails.length} / {COPE_IDEA_MAX}
              </p>
            </FieldShell>
          )}
        </section>

        {/* Business / third space */}
        <section className="space-y-6">
          <SectionHeading>Businesses &amp; third spaces</SectionHeading>

          <YesNoGroup
            question="Do you run a business or a third space?"
            name={`${id}-business`}
            value={draft.business}
            error={errors.business}
            hint="A coffee shop, bar, salon, gym, bookstore, church basement, makerspace, studio — anywhere people already gather."
            onChange={(value) => set("business", value)}
          />

          {draft.business === "yes" && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <FieldShell
                  label="Name of the business or space"
                  htmlFor={`${id}-businessName`}
                  error={errors.businessName}
                >
                  {textInput("businessName", { autoComplete: "organization" })}
                </FieldShell>
                <FieldShell
                  label="Where is it?"
                  htmlFor={`${id}-businessLocation`}
                  error={errors.businessLocation}
                >
                  {textInput("businessLocation", {
                    placeholder: "Address or neighborhood",
                  })}
                </FieldShell>
              </div>

              <CheckboxChipGroup<BusinessOffer>
                question="What would you be open to?"
                options={BUSINESS_OFFERS}
                value={draft.businessOffers}
                onToggle={(item) => toggleIn("businessOffers", item)}
              />
            </>
          )}
        </section>

        {/* Anything else */}
        <section className="space-y-6">
          <SectionHeading>Anything else?</SectionHeading>

          <FieldShell
            label="Skills, connections, languages you speak, times you're available, or anything else we should know"
            htmlFor={`${id}-notes`}
            error={errors.notes}
          >
            <textarea
              id={`${id}-notes`}
              rows={4}
              maxLength={COPE_NOTES_MAX}
              value={draft.notes}
              onChange={(event) => set("notes", event.target.value)}
              aria-invalid={Boolean(errors.notes)}
              data-invalid={Boolean(errors.notes)}
              className={`${inputClass(Boolean(errors.notes))} resize-y`}
            />
            <p className="mt-1 text-right text-xs text-ink">
              {draft.notes.length} / {COPE_NOTES_MAX}
            </p>
          </FieldShell>
        </section>

        {/* Staying in touch */}
        <section className="space-y-6">
          <SectionHeading>Staying in touch</SectionHeading>

          <CheckboxChip
            label="You can text me about volunteer shifts and election news. Message and data rates may apply. Reply STOP at any time to stop receiving messages."
            checked={draft.smsConsent}
            onChange={(checked) => set("smsConsent", checked)}
          />
        </section>
      </div>

      <FormErrorBanner message={formError} />

      <SubmitButton submitting={submitting} label="Sign me up" />

      <p className="mt-4 text-sm text-ink">
        We&rsquo;ll only use your information to plug you into COPE volunteer
        work and keep you posted on election news. We never sell or share it.
      </p>
    </form>
  );
}
