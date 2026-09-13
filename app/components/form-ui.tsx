"use client";

/**
 * Form building blocks shared by every form on the site.
 *
 * The pills and chips wrap visually-hidden native inputs, with the styled
 * <label> standing in for them. Two things in globals.css depend on the exact
 * DOM shape here, so keep it:
 *
 *   - the forced-colors rule `label:has(> input:checked)` needs the input to be
 *     a DIRECT child of the label;
 *   - `label[data-pill]` is what gets the ✓ glyph in high-contrast mode.
 *
 * And because the input itself is a 1×1 clipped box, the focus ring has to be
 * drawn on the label via `has-[:focus-visible]:outline-*`. See README.md,
 * "Keyboard accessibility".
 */

export const inputBase =
  "w-full rounded-xl border-2 bg-white px-4 py-3 text-navy placeholder:text-navy/35 transition focus:outline-none focus:ring-4 focus:ring-gold/30";

export const inputState = (invalid: boolean) =>
  invalid
    ? "border-brick focus:border-brick"
    : "border-navy/15 focus:border-gold";

export const inputClass = (invalid: boolean) =>
  `${inputBase} ${inputState(invalid)}`;

export function CheckIcon({ className = "" }: { className?: string }) {
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

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b-2 border-navy/10 pb-3 text-xl text-navy">
      {children}
    </h3>
  );
}

export function FieldError({ id, children }: { id?: string; children: string }) {
  return (
    <p id={id} className="mt-2 text-sm font-semibold text-brick" role="alert">
      {children}
    </p>
  );
}

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  optional,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  /** Shows an "Optional" tag — for forms where most fields are required. */
  optional?: boolean;
  /** Shows a "Required" tag — for forms where most fields are optional. */
  required?: boolean;
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
        {required && (
          <span className="ml-2 font-body text-sm font-normal text-brick">
            Required
          </span>
        )}
      </label>
      {hint && <p className="mb-2 text-sm text-ink">{hint}</p>}
      {children}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

const pillLabelClass = (selected: boolean, invalid: boolean, stacked: boolean) =>
  `cursor-pointer border-2 font-semibold transition select-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
    stacked ? "rounded-xl px-5 py-3 text-left" : "rounded-full px-7 py-2.5"
  } ${
    selected
      ? "border-navy bg-navy text-cream"
      : `bg-white text-navy hover:border-navy/50 ${
          invalid ? "border-brick" : "border-navy/20"
        }`
  }`;

export type PillOption<T extends string> = { value: T; label: string };

/**
 * A single-choice question rendered as real radios styled as pills.
 *
 * `layout="row"` is for short answers (Yes / No); `layout="stack"` puts each
 * option on its own line for answers that are whole sentences.
 */
export function RadioPillGroup<T extends string>({
  question,
  name,
  options,
  value,
  error,
  hint,
  required,
  layout = "row",
  onChange,
}: {
  question: string;
  name: string;
  options: readonly PillOption<T>[];
  value: T | "";
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  layout?: "row" | "stack";
  onChange: (value: T) => void;
}) {
  const errorId = `${name}-error`;
  const stacked = layout === "stack";

  return (
    <fieldset
      // Focusable only programmatically, so `focusFirstError` can reach a
      // group that is the first thing left unanswered.
      tabIndex={-1}
      data-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className="focus:outline-none"
    >
      <legend className="font-display text-base font-bold text-navy">
        {question}
        {required && (
          <span className="ml-2 font-body text-sm font-normal text-brick">
            Required
          </span>
        )}
      </legend>
      {hint && <p className="mt-1 text-sm text-ink">{hint}</p>}
      <div
        className={`mt-3 flex gap-3 ${stacked ? "flex-col" : "flex-wrap"}`}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              // Hook for the forced-colors rule in globals.css, which adds a
              // check glyph to the selected pill.
              data-pill=""
              // The real radio is visually hidden, so the focus ring has to be
              // drawn on the label the user can actually see. Navy (not gold)
              // because it has to read against both the white pill and the
              // navy-filled selected one; outline-offset leaves a paper-coloured
              // gap so it stays visible on the dark fill.
              className={pillLabelClass(selected, Boolean(error), stacked)}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

/** Yes/No as a pair of real radios, styled as pills. */
export function YesNoGroup({
  question,
  name,
  value,
  error,
  hint,
  required,
  onChange,
}: {
  question: string;
  name: string;
  value: "yes" | "no" | "";
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  onChange: (value: "yes" | "no") => void;
}) {
  return (
    <RadioPillGroup
      question={question}
      name={name}
      options={YES_NO_OPTIONS}
      value={value}
      error={error}
      hint={hint}
      required={required}
      onChange={onChange}
    />
  );
}

/** A checkbox styled as a chip with its own drawn checkmark. */
export function CheckboxChip({
  label,
  checked,
  onChange,
  name,
  value,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  value?: string;
}) {
  return (
    <label
      // Same reasoning as the pills: the checkbox is visually hidden, so the
      // label carries the focus ring.
      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 font-semibold transition select-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
        checked
          ? "border-navy bg-navy text-cream"
          : "border-navy/20 bg-white text-navy hover:border-navy/50"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
          checked ? "border-gold bg-gold text-navy" : "border-navy/30 bg-white"
        }`}
      >
        {checked && <CheckIcon className="h-3.5 w-3.5" />}
      </span>
      {label}
    </label>
  );
}

/** A "check all that apply" question rendered as a grid of chips. */
export function CheckboxChipGroup<T extends string>({
  question,
  hint = "Check all that apply.",
  options,
  value,
  onToggle,
}: {
  question: string;
  hint?: React.ReactNode;
  options: readonly T[];
  value: readonly T[];
  onToggle: (option: T) => void;
}) {
  return (
    <fieldset>
      <legend className="font-display text-base font-bold text-navy">
        {question}
      </legend>
      {hint && <p className="mt-1 mb-3 text-sm text-ink">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <CheckboxChip
            key={option}
            label={option}
            checked={value.includes(option)}
            onChange={() => onToggle(option)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Honeypot — off-screen, hidden from assistive tech, ignored by humans. */
export function HoneypotField({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
    >
      <label htmlFor={id}>Leave this field empty</label>
      <input
        id={id}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function FormErrorBanner({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="mt-8">
      {message && (
        <p className="mb-4 rounded-xl border-2 border-brick/30 bg-brick/5 px-4 py-3 font-semibold text-brick">
          {message}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  submitting,
  label,
}: {
  submitting: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full rounded-xl bg-gold px-8 py-4 font-display text-lg font-extrabold text-navy transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {submitting ? "Sending…" : label}
    </button>
  );
}

export const formCardClass =
  "rounded-2xl border-2 border-navy/10 bg-paper p-6 shadow-[0_2px_0_0_rgba(17,1,88,0.08)] sm:p-10";

export function SuccessPanel({
  title,
  message,
  onReset,
}: {
  title: string;
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-navy/10 bg-paper p-10 text-center shadow-[0_2px_0_0_rgba(17,1,88,0.08)] sm:p-14">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold">
        <CheckIcon className="h-8 w-8 text-navy" />
      </div>
      <h2 className="mb-3 text-3xl text-navy sm:text-4xl">{title}</h2>
      <p className="mx-auto mb-8 max-w-md text-lg text-ink">{message}</p>
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

/** Scroll to and focus the first control flagged `data-invalid="true"`. */
export function focusFirstError() {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>('[data-invalid="true"]');
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  });
}

/** Shared POST-and-interpret step so both forms treat the API identically. */
export async function postSubmission(
  url: string,
  body: unknown,
): Promise<
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      return {
        ok: false,
        error: result.error ?? "Something went wrong. Please try again.",
        fieldErrors: result.fieldErrors,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "We couldn't reach the server. Check your connection and try again.",
    };
  }
}
