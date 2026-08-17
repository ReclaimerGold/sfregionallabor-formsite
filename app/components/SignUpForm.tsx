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
  type YesNo,
} from "@/lib/form-schema";
import { nextPhoneInputState } from "@/lib/phone";

const inputBase =
  "w-full rounded-xl border-2 bg-white px-4 py-3 text-navy placeholder:text-navy/35 transition focus:outline-none focus:ring-4 focus:ring-gold/30";

const inputState = (invalid: boolean) =>
  invalid
    ? "border-brick focus:border-brick"
    : "border-navy/15 focus:border-gold";

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-display text-base font-bold text-navy"
      >
        {label}
        {optional && (
          <span className="ml-2 font-body text-sm font-normal text-ink">
            Optional
          </span>
        )}
      </label>
      {hint && <p className="mb-2 text-sm text-ink">{hint}</p>}
      {children}
      {error && (
        <p className="mt-2 text-sm font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Yes/No as a pair of real radios, styled as pills. */
function YesNoGroup({
  question,
  name,
  value,
  error,
  onChange,
}: {
  question: string;
  name: string;
  value: YesNo | "";
  error?: string;
  onChange: (value: YesNo) => void;
}) {
  const errorId = `${name}-error`;

  return (
    <fieldset
      // Focusable only programmatically, so `focusFirstError` can reach a
      // Yes/No group that is the first thing left unanswered.
      tabIndex={-1}
      data-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className="focus:outline-none"
    >
      <legend className="mb-3 font-display text-base font-bold text-navy">
        {question}
      </legend>
      <div className="flex gap-3">
        {(["yes", "no"] as const).map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              // Hook for the forced-colors rule in globals.css, which adds a
              // check glyph to the selected pill. Committee chips already draw
              // their own checkmark, so this targets the pills only.
              data-pill=""
              // The real radio is visually hidden, so the focus ring has to be
              // drawn on the label the user can actually see. Navy (not gold)
              // because it has to read against both the white pill and the
              // navy-filled selected one; outline-offset leaves a paper-coloured
              // gap so it stays visible on the dark fill.
              className={`cursor-pointer rounded-full border-2 px-7 py-2.5 font-semibold transition select-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
                selected
                  ? "border-navy bg-navy text-cream"
                  : `bg-white text-navy hover:border-navy/50 ${
                      error ? "border-brick" : "border-navy/20"
                    }`
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {option === "yes" ? "Yes" : "No"}
            </label>
          );
        })}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-2 text-sm font-semibold text-brick"
          role="alert"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}

function SuccessPanel({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-navy/10 bg-paper p-10 text-center shadow-[0_2px_0_0_rgba(17,1,88,0.08)] sm:p-14">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold">
        <CheckIcon className="h-8 w-8 text-navy" />
      </div>
      <h2 className="mb-3 text-3xl text-navy sm:text-4xl">Thanks — you&rsquo;re in.</h2>
      <p className="mx-auto mb-8 max-w-md text-lg text-ink">
        We&rsquo;ve got your information. Someone from the Sioux Falls Regional
        Labor Federation will follow up with you soon.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border-2 border-navy/20 bg-white px-6 py-3 font-semibold text-navy transition hover:border-navy/50"
      >
        Submit another response
      </button>
    </div>
  );
}

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

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        '[data-invalid="true"]',
      );
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.focus({ preventScroll: true });
    });
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

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, [HONEYPOT_FIELD]: honeypot }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(
          result.error ?? "Something went wrong. Please try again.",
        );
        setStatus("error");
        if (result.fieldErrors) focusFirstError();
        return;
      }

      setStatus("success");
      setDraft(emptyDraft);
    } catch {
      setFormError(
        "We couldn't reach the server. Check your connection and try again.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return <SuccessPanel onReset={() => setStatus("idle")} />;
  }

  const submitting = status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border-2 border-navy/10 bg-paper p-6 shadow-[0_2px_0_0_rgba(17,1,88,0.08)] sm:p-10"
    >
      {/* Honeypot — off-screen, hidden from assistive tech, ignored by humans. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor={`${id}-website`}>Leave this field empty</label>
        <input
          id={`${id}-website`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="space-y-10">
        {/* 1–3: contact details */}
        <section className="space-y-6">
          <h3 className="border-b-2 border-navy/10 pb-3 text-xl text-navy">
            About you
          </h3>

          <FieldShell label="Name" htmlFor={`${id}-name`} error={errors.name}>
            <input
              id={`${id}-name`}
              type="text"
              autoComplete="name"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              aria-invalid={Boolean(errors.name)}
              data-invalid={Boolean(errors.name)}
              className={`${inputBase} ${inputState(Boolean(errors.name))}`}
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
                className={`${inputBase} ${inputState(Boolean(errors.phone))}`}
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
                className={`${inputBase} ${inputState(Boolean(errors.email))}`}
              />
            </FieldShell>
          </div>
        </section>

        {/* 4–5: union membership */}
        <section className="space-y-6">
          <h3 className="border-b-2 border-navy/10 pb-3 text-xl text-navy">
            Union membership
          </h3>

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
                className={`${inputBase} ${inputState(Boolean(errors.unionName))}`}
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
          <h3 className="border-b-2 border-navy/10 pb-3 text-xl text-navy">
            Organizations &amp; businesses
          </h3>

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
                className={`${inputBase} ${inputState(Boolean(errors.partnerOrgName))}`}
              />
            </FieldShell>
          )}
        </section>

        {/* 7–8: getting involved */}
        <section className="space-y-6">
          <h3 className="border-b-2 border-navy/10 pb-3 text-xl text-navy">
            Getting involved
          </h3>

          <YesNoGroup
            question="Are you interested in volunteering?"
            name={`${id}-volunteer`}
            value={draft.volunteer}
            error={errors.volunteer}
            onChange={(value) => set("volunteer", value)}
          />

          <fieldset>
            <legend className="font-display text-base font-bold text-navy">
              Which committees interest you?
            </legend>
            <p className="mt-1 mb-3 text-sm text-ink">Check all that apply.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMITTEES.map((committee) => {
                const selected = draft.committees.includes(committee);
                return (
                  <label
                    key={committee}
                    // Same reasoning as the Yes/No pills: the checkbox is
                    // visually hidden, so the label carries the focus ring.
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 font-semibold transition select-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
                      selected
                        ? "border-navy bg-navy text-cream"
                        : "border-navy/20 bg-white text-navy hover:border-navy/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCommittee(committee)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                        selected
                          ? "border-gold bg-gold text-navy"
                          : "border-navy/30 bg-white"
                      }`}
                    >
                      {selected && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    {committee}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        {/* 9: free text */}
        <section className="space-y-6">
          <h3 className="border-b-2 border-navy/10 pb-3 text-xl text-navy">
            Anything else
          </h3>

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
              className={`${inputBase} resize-y ${inputState(Boolean(errors.notes))}`}
            />
            <p className="mt-1 text-right text-xs text-ink">
              {draft.notes.length} / {NOTES_MAX}
            </p>
          </FieldShell>
        </section>
      </div>

      <div aria-live="polite" className="mt-8">
        {formError && (
          <p className="mb-4 rounded-xl border-2 border-brick/30 bg-brick/5 px-4 py-3 font-semibold text-brick">
            {formError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-gold px-8 py-4 font-display text-lg font-extrabold text-navy transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Sending…" : "Submit"}
      </button>

      <p className="mt-4 text-sm text-ink">
        We&rsquo;ll only use your information to follow up and keep you posted on
        SFRLF news. We never sell or share it.
      </p>
    </form>
  );
}
