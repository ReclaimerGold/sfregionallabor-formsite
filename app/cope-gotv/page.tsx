import type { Metadata } from "next";
import CopeGotvForm from "../components/CopeGotvForm";
import { ShieldIcon, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "COPE Get Out the Vote Volunteers | Sioux Falls Regional Labor Federation",
  description:
    "Sign up to volunteer with the Sioux Falls Regional Labor Federation's Committee on Political Education (COPE) for the next election — knocking doors, phone banking, driving voters, and more. You don't have to be a union member.",
};

/** The gold band between the hero and the form. Edit the line here. */
const BAND_MESSAGE =
  "You don’t have to be a union member to help get out the vote.";

export default function CopeGotvPage() {
  return (
    <>
      <SiteHeader
        current="/cope-gotv"
        cta={{ href: "#cope-signup", label: "Sign Me Up" }}
      />

      <main className="flex-1">
        <section className="bg-navy px-5 pt-10 pb-20 text-center sm:pt-16">
          <div className="mx-auto max-w-4xl">
            <p className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full bg-navy-raised px-5 py-2.5 text-sm font-bold text-gold sm:text-base">
              <ShieldIcon className="h-4 w-4" />
              Committee on Political Education
            </p>

            <h1 className="text-5xl leading-[1.05] text-cream sm:text-6xl lg:text-7xl">
              Get Out the Vote
              <span className="mt-2 block text-gold">Volunteer with COPE</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-mist sm:text-xl">
              The Sioux Falls Regional Labor Federation&rsquo;s Committee on
              Political Education (COPE) is building a volunteer list for the
              next election. You do not have to be a union member to sign up.
              Tell us how you want to help and we&rsquo;ll get you plugged in.
            </p>
          </div>
        </section>

        <section className="bg-gold px-5 py-8 sm:py-10">
          <p className="mx-auto max-w-3xl text-center font-display text-2xl font-extrabold text-balance text-navy sm:text-3xl">
            {BAND_MESSAGE}
          </p>
        </section>

        <section id="cope-signup" className="scroll-mt-6 px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="text-4xl text-navy sm:text-5xl">
                Volunteer Signup
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink">
                It takes about three minutes. Only a few fields are required,
                but the more you tell us, the better we can match you to work
                you&rsquo;ll enjoy.
              </p>
            </div>

            <CopeGotvForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
