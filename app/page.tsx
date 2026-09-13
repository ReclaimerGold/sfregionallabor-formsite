import SignUpForm from "./components/SignUpForm";
import { ShieldIcon, SiteFooter, SiteHeader } from "./components/SiteChrome";

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

      <SiteHeader
        current="/"
        cta={{ href: "#get-involved", label: "Join SFRLF" }}
      />

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

      <SiteFooter />
    </>
  );
}
