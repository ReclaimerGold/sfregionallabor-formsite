import SignUpForm from "./components/SignUpForm";

/**
 * Announcement bar copy, carried over from the Figma reference.
 * Set to `null` to hide the bar entirely.
 */
const ANNOUNCEMENT: { text: string; href: string; linkLabel: string } | null = {
  text: "📣 Labor Day Picnic — Sunday, September 13, 2026 | 1–3 PM, Covell Lake Park, Sioux Falls",
  // Point at a real event page when there is one; for now it drives to the form.
  href: "#get-involved",
  linkLabel: "Sign Up",
};

/** The gold band between the hero and the form. Edit the line here. */
const BAND_MESSAGE =
  "However you want to get involved, there’s a place for you here.";

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2.75 4.75 5.5v6c0 4.35 3 8.4 7.25 9.75 4.25-1.35 7.25-5.4 7.25-9.75v-6L12 2.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold">
        <ShieldIcon className="h-6 w-6 text-navy" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-2xl font-extrabold tracking-tight text-gold">
          SFRLF
        </div>
        <div className="text-[11px] tracking-[0.12em] text-cream/80 uppercase sm:text-xs">
          Sioux Falls Regional Labor Federation
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {ANNOUNCEMENT && (
        <div className="bg-brick px-4 py-3 text-center text-sm font-bold text-white sm:text-base">
          <span>{ANNOUNCEMENT.text}</span>{" "}
          <a
            href={ANNOUNCEMENT.href}
            className="ml-2 underline underline-offset-4 hover:text-gold"
          >
            {ANNOUNCEMENT.linkLabel}
          </a>
        </div>
      )}

      <header className="bg-navy">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Logo />
          <a
            href="#get-involved"
            className="rounded-xl bg-gold px-6 py-3 text-center font-display font-extrabold text-navy transition hover:bg-gold-deep"
          >
            Join SFRLF
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-navy px-5 pt-10 pb-20 text-center sm:pt-16">
          <div className="mx-auto max-w-4xl">
            <p className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full bg-navy-raised px-5 py-2.5 text-sm font-bold text-gold sm:text-base">
              <ShieldIcon className="h-4 w-4" />
              Serving Sioux Falls &amp; Eastern South Dakota Since 1937
            </p>

            <h1 className="text-5xl leading-[1.05] text-cream sm:text-6xl lg:text-7xl">
              Get Involved
              <span className="mt-2 block text-gold">
                with Your Labor Community
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-mist sm:text-xl">
              Tell us a bit about yourself and how you&rsquo;d like to plug in —
              volunteering, committee work, or partnering with the federation.
              We&rsquo;ll follow up personally.
            </p>
          </div>
        </section>

        <section className="bg-gold px-5 py-8 sm:py-10">
          {/* Sized below the h1 above and the h2 below so it reads as a
              connector rather than competing with either heading. */}
          <p className="mx-auto max-w-3xl text-center font-display text-2xl font-extrabold text-balance text-navy sm:text-3xl">
            {BAND_MESSAGE}
          </p>
        </section>

        <section id="get-involved" className="scroll-mt-6 px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="text-4xl text-navy sm:text-5xl">
                Tell Us About Yourself
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink">
                It takes about two minutes. Everything except the last question
                is required.
              </p>
            </div>

            <SignUpForm />
          </div>
        </section>
      </main>

      <footer className="bg-navy px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <Logo />
          <p className="text-sm text-mist">
            &copy; {new Date().getFullYear()} Sioux Falls Regional Labor
            Federation. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
