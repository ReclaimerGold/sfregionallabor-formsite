"use client";

import { useId, useState } from "react";
import {
  COMMITTEES,
  HONEYPOT_FIELD,
  NOTES_MAX,
  emptyDraft,
  normalizeDraft,
  prepareForSubmit,
  submissionSchema,
  toFieldErrors,
  type Committee,
  type FieldErrors,
  type SubmissionDraft,
} from "@/lib/form-schema";
import { nextPhoneInputState } from "@/lib/phone";
import {
  CheckboxChipGroup,
  FieldShell,
  FormErrorBanner,
  HoneypotField,
  SectionHeading,
  SubmitButton,
  SuccessPanel,
  YesNoGroup,
  focusFirstError,
  formCardClass,
  inputClass,
  postSubmission,
} from "./form-ui";

export default function SignUpForm() {
  const id = useId();
  const [draft, setDraft] = useState<SubmissionDraft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [honeypot, setHoneypot] = useState("");

  const set = <K extends keyof SubmissionDraft>(
    key: K,
    value: SubmissionDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  /**
   * Reformats as you type while keeping the caret on the same digit.
   *
   * Two things make a naive formatter feel broken, and both are handled here:
   * mid-string edits would fling the caret to the end, and backspacing over a
   * separator like ")" would delete nothing, silently reformat, and leave the
   * key doing nothing at all.
   */
  function handlePhoneChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const { value, caret } = nextPhoneInputState({
      previous: draft.phone,
      raw: input.value,
      caret: input.selectionStart ?? input.value.length,
      inputType: (event.nativeEvent as InputEvent).inputType,
    });

    // Write to the DOM before setState so the caret never flashes at the end;
    // React's re-render then sees the value it already has and does nothing.
    input.value = value;
    input.setSelectionRange(caret, caret);

    set("phone", value);
  }

  const toggleCommittee = (committee: Committee) => {
    setDraft((current) => ({
      ...current,
      committees: current.committees.includes(committee)
        ? current.committees.filter((item) => item !== committee)
        : [...current.committees, committee],
    }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const candidate = prepareForSubmit(draft);
    const parsed = submissionSchema.safeParse(normalizeDraft(candidate));

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Please check the highlighted fields.");
      focusFirstError();
      return;
    }

    setErrors({});
    setStatus("submitting");

    const result = await postSubmission("/api/submit", {
      ...parsed.data,
      [HONEYPOT_FIELD]: honeypot,
    });

    if (!result.ok) {
      setErrors((result.fieldErrors as FieldErrors | undefined) ?? {});
      setFormError(result.error);
      setStatus("error");
      if (result.fieldErrors) focusFirstError();
      return;
    }

    setStatus("success");
    setDraft(emptyDraft);
  }

  if (status === "success") {
    return (
      <SuccessPanel
        title="Thanks — you’re in."
        message="We’ve got your information. Someone from the Sioux Falls Regional Labor Federation will follow up with you soon."
        onReset={() => setStatus("idle")}
      />
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className={formCardClass}>
      <HoneypotField
        id={`${id}-website`}
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={setHoneypot}
      />

      <div className="space-y-10">
        {/* 1–3: contact details */}
        <section className="space-y-6">
          <SectionHeading>About you</SectionHeading>

          <FieldShell label="Name" htmlFor={`${id}-name`} error={errors.name}>
            <input
              id={`${id}-name`}
              type="text"
              autoComplete="name"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              aria-invalid={Boolean(errors.name)}
              data-invalid={Boolean(errors.name)}
              className={inputClass(Boolean(errors.name))}
            />
          </FieldShell>

          <div className="grid gap-6 sm:grid-cols-2">
            <FieldShell
              label="Phone number"
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

            <FieldShell
              label="Email address"
              htmlFor={`${id}-email`}
              error={errors.email}
            >
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={draft.email}
                onChange={(event) => set("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
                data-invalid={Boolean(errors.email)}
                className={inputClass(Boolean(errors.email))}
              />
            </FieldShell>
          </div>
        </section>

        {/* 4–5: union membership */}
        <section className="space-y-6">
          <SectionHeading>Union membership</SectionHeading>

          <YesNoGroup
            question="Are you a union member?"
            name={`${id}-unionMember`}
            value={draft.unionMember}
            error={errors.unionMember}
            onChange={(value) => set("unionMember", value)}
          />

          {draft.unionMember === "yes" && (
            <FieldShell
              label="Which union?"
              htmlFor={`${id}-unionName`}
              error={errors.unionName}
            >
              <input
                id={`${id}-unionName`}
                type="text"
                placeholder="e.g. IBEW Local 426"
                value={draft.unionName}
                onChange={(event) => set("unionName", event.target.value)}
                aria-invalid={Boolean(errors.unionName)}
                data-invalid={Boolean(errors.unionName)}
                className={inputClass(Boolean(errors.unionName))}
              />
            </FieldShell>
          )}

          <YesNoGroup
            question="Are you a retired union member?"
            name={`${id}-retiredUnionMember`}
            value={draft.retiredUnionMember}
            error={errors.retiredUnionMember}
            onChange={(value) => set("retiredUnionMember", value)}
          />
        </section>

        {/* 6: partnerships */}
        <section className="space-y-6">
          <SectionHeading>Organizations &amp; businesses</SectionHeading>

          <YesNoGroup
            question="Are you part of an organization or business that would want to work with the labor federation?"
            name={`${id}-partnerOrg`}
            value={draft.partnerOrg}
            error={errors.partnerOrg}
            onChange={(value) => set("partnerOrg", value)}
          />

          {draft.partnerOrg === "yes" && (
            <FieldShell
              label="Which one?"
              htmlFor={`${id}-partnerOrgName`}
              error={errors.partnerOrgName}
            >
              <input
                id={`${id}-partnerOrgName`}
                type="text"
                placeholder="Organization or business name"
                value={draft.partnerOrgName}
                onChange={(event) => set("partnerOrgName", event.target.value)}
                aria-invalid={Boolean(errors.partnerOrgName)}
                data-invalid={Boolean(errors.partnerOrgName)}
                className={inputClass(Boolean(errors.partnerOrgName))}
              />
            </FieldShell>
          )}
        </section>

        {/* 7–8: getting involved */}
        <section className="space-y-6">
          <SectionHeading>Getting involved</SectionHeading>

          <YesNoGroup
            question="Are you interested in volunteering?"
            name={`${id}-volunteer`}
            value={draft.volunteer}
            error={errors.volunteer}
            onChange={(value) => set("volunteer", value)}
          />

          <CheckboxChipGroup
            question="Which committees interest you?"
            options={COMMITTEES}
            value={draft.committees}
            onToggle={toggleCommittee}
          />
        </section>

        {/* 9: free text */}
        <section className="space-y-6">
          <SectionHeading>Anything else</SectionHeading>

          <FieldShell
            label="Anything else we should know?"
            htmlFor={`${id}-notes`}
            error={errors.notes}
            optional
          >
            <textarea
              id={`${id}-notes`}
              rows={4}
              maxLength={NOTES_MAX}
              value={draft.notes}
              onChange={(event) => set("notes", event.target.value)}
              aria-invalid={Boolean(errors.notes)}
              data-invalid={Boolean(errors.notes)}
              className={`${inputClass(Boolean(errors.notes))} resize-y`}
            />
            <p className="mt-1 text-right text-xs text-ink">
              {draft.notes.length} / {NOTES_MAX}
            </p>
          </FieldShell>
        </section>
      </div>

      <FormErrorBanner message={formError} />

      <SubmitButton submitting={submitting} label="Submit" />

      <p className="mt-4 text-sm text-ink">
        We&rsquo;ll only use your information to follow up and keep you posted on
        SFRLF news. We never sell or share it.
      </p>
    </form>
  );
}
