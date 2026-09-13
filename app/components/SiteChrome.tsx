import Link from "next/link";

/**
 * Header, footer and logo shared by every page. Server components — nothing
 * here needs state.
 */

export const NAV_LINKS = [
  { href: "/", label: "Get Involved" },
  { href: "/cope-gotv", label: "Vote Volunteers" },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]["href"];

export function ShieldIcon({ className = "" }: { className?: string }) {
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

export function Logo() {
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

export function SiteHeader({
  current,
  cta,
}: {
  /** Which nav entry is the page being shown. */
  current: NavHref;
  /** The gold button — normally a jump to this page's form. */
  cta: { href: string; label: string };
}) {
  return (
    <header className="bg-navy">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <Link
          href="/"
          aria-label="SFRLF home"
          className="rounded-xl focus-visible:outline-gold"
        >
          <Logo />
        </Link>

        <nav
          aria-label="Site"
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          {NAV_LINKS.map((link) => {
            const active = link.href === current;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`font-display text-base font-bold underline-offset-[6px] transition hover:text-gold ${
                  active
                    ? "text-gold underline decoration-2"
                    : "text-cream/85"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={cta.href}
            className="rounded-xl bg-gold px-6 py-3 text-center font-display font-extrabold text-navy transition hover:bg-gold-deep"
          >
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <Logo />
        <p className="text-sm text-mist">
          &copy; {new Date().getFullYear()} Sioux Falls Regional Labor
          Federation. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
