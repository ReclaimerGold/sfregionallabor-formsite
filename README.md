# SFRLF — Get Involved form

Single-page sign-up site for the **Sioux Falls Regional Labor Federation**.
A submission can go to two places:

1. **Mailgun** — emails a notification to whoever handles follow-up, with
   `Reply-To` set to the submitter so replying reaches them directly.
2. **MailerLite** *(optional)* — creates or updates the subscriber, writes every
   answer to a custom field, and adds them to a group (plus a second group if
   they said yes to volunteering). Leave `MAILERLITE_API_KEY` blank to skip it
   entirely and run notification-only.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and
Zod. The styling follows the Figma Make reference in [`design/`](design/).

---

## Quick start

```bash
npm install
cp .env.example .env           # then fill it in — see below
npm run setup:mailerlite       # OPTIONAL — only if you're using MailerLite
npm run dev                    # http://localhost:3000
```

Or with Docker — see [Docker & Portainer](#docker--portainer).

## Configuration

All secrets live in `.env` (git-ignored). One file serves both paths: Next.js
reads `.env` directly, and Docker Compose reads it for `${VAR}` substitution.
See [`.env.example`](.env.example) for the annotated template.

| Variable | Required | What it's for |
| --- | --- | --- |
| `MAILERLITE_API_KEY` | no | MailerLite → Integrations → API. Leave blank to skip MailerLite entirely and run notification-only. |
| `MAILERLITE_GROUP_ID` | strongly recommended | Group every submission joins. Left unset, subscribers are still created but land in no group — which defeats the segmentation below. It's not enforced because you need a running app (or `npm run setup:mailerlite`) to discover the ID in the first place. |
| `MAILERLITE_VOLUNTEER_GROUP_ID` | no | Extra group when "interested in volunteering" is Yes |
| `MAILERLITE_GROUP_NAME` | no | Setup script creates this group if missing |
| `MAILGUN_API_KEY` | yes | Mailgun sending API key |
| `MAILGUN_DOMAIN` | yes | Verified sending domain, e.g. `mg.sfrlf.org` |
| `MAILGUN_REGION` | no | `eu` for EU accounts; anything else uses the US API |
| `NOTIFY_TO` | yes | Who receives the notification (comma-separate for several) |
| `NOTIFY_FROM` | no | Sender address; defaults to `forms@$MAILGUN_DOMAIN` |

### MailerLite: groups, not segments

MailerLite's API **cannot assign a segment** — segments are rule-based and
MailerLite evaluates them itself. The API assigns **groups**, so that's what
this app does.

To get segment behaviour, build a segment in the MailerLite UI on top of what
the form writes. For example:

- *Volunteers* → subscribers in the volunteer group, or where `volunteer` is `Yes`
- *Retirees* → where `retired_union_member` is `Yes`
- *Organizing committee interest* → where `committees` contains `Organizing`
- *Business partners* → where `partner_org` is `Yes`

The segment then stays up to date automatically as new submissions arrive.

### MailerLite fields

`name` and `phone` are MailerLite built-ins. Everything else is a custom field
declared in [`config/mailerlite-fields.json`](config/mailerlite-fields.json)
and created by `npm run setup:mailerlite`:

| Key | Holds |
| --- | --- |
| `union_member` | `Yes` / `No` |
| `union_name` | Free text (only when union member is Yes) |
| `retired_union_member` | `Yes` / `No` |
| `partner_org` | `Yes` / `No` |
| `partner_org_name` | Free text (only when partner org is Yes) |
| `volunteer` | `Yes` / `No` |
| `committees` | Comma-separated list |
| `notes` | The optional free-text answer |
| `signup_source` | Always `Website get-involved form` |

MailerLite only supports `text`, `number` and `date` field types — there is no
boolean or multi-select — which is why Yes/No answers are stored as text and
committees as a comma-separated list.

### Phone numbers

The phone field auto-formats as you type — `6055550123` becomes
`(605) 555-0123`, and a leading `1` is recognised as the country code and
rendered `+1 (605) 555-0123`.

Whatever shape it's typed or pasted in, it is **stored as E.164**
(`+16055550123`) so MailerLite always receives one consistent format — useful
if you ever add SMS. The notification email shows the readable `(605) 555-0123`
form instead, since a person reads that one.

Validation follows NANP rules: exactly 10 national digits, with the area code
and exchange code each starting 2–9. That rejects `(123) 456-7890` and
`(605) 155-0123`, which a plain length check would let through.

All of this lives in [`lib/phone.ts`](lib/phone.ts) and is covered by
`npm test` — 61 assertions over keystroke-by-keystroke typing,
backspacing across separators, mid-string edits, pasted formats, and validation
edge cases. Run it after touching that file.

The setup script is idempotent: run it as often as you like. It skips fields
that already exist and warns if one exists with an unexpected type.

### Mailgun: deliverability

- **A sandbox domain only delivers to pre-authorized recipients.** If you're
  testing with `sandboxXXXX.mailgun.org`, add `NOTIFY_TO` under *Authorized
  Recipients* in Mailgun or the notification will never arrive.
- For production, verify a real sending domain and set its SPF/DKIM records.
- `NOTIFY_FROM` must be on `MAILGUN_DOMAIN`. Mailgun rejects mismatched senders.

## How a submission is handled

`app/api/submit/route.ts`:

1. Rate-limits by IP (5/minute per instance).
2. Checks the honeypot field — if filled, returns success without doing
   anything, so bots get no signal.
3. Re-validates the payload with the **same Zod schema the client uses**
   (`lib/form-schema.ts`), so the two can't drift.
4. Calls MailerLite and Mailgun **concurrently**.

**Acceptance rule:** a submission is accepted if and only if **at least one
*configured* destination actually recorded it**. A skipped integration — one
you've deliberately left unconfigured — never counts as a success.

That matters. If MailerLite is unconfigured and Mailgun then fails, the request
returns 502 rather than telling the submitter "thanks" while their answers go
nowhere. If both are configured and only one fails, the submission still stands:
the notification email carries every answer, and the subscriber record carries
them too. Failures are logged with a `[submit]` prefix — watch those logs, since
a half-failure still shows the submitter a success page.

The rule lives in [`lib/delivery.ts`](lib/delivery.ts) and is unit-tested,
including the case that's hard to reach live (skipped + failed → rejected).

## Keyboard accessibility

The Yes/No pills and committee chips are real `<input type="radio">` /
`<input type="checkbox">` elements that are visually hidden, with the styled
`<label>` standing in for them. That keeps native semantics and screen-reader
behaviour — but it means **the focus ring has to be drawn on the label**, since
the element that actually receives focus is a 1×1 clipped box.

That's what `has-[:focus-visible]:outline-*` on those labels is for. Remove it
and 11 of the form's 18 tab stops become invisible to keyboard users. The ring
is navy rather than gold because it has to stay legible against both the white
unselected pill and the navy-filled selected one.

Radio groups follow **native** keyboard semantics, which surprises people who
expect Tab everywhere: Tab moves *between* questions, arrow keys move *within* a
Yes/No pair. That's the behaviour assistive tech expects — don't "fix" it.

### High contrast mode is not optional either

Selection is signalled by a navy fill, and **Windows High Contrast mode throws
author background colours away** — so a chosen "Yes" once rendered identically
to the "No" beside it. Text inputs had the same problem: their focus ring is a
`box-shadow`, which is also discarded, on top of a `focus:outline-none`.

Both are restated in a `@media (forced-colors: active)` block in
[`app/globals.css`](app/globals.css) using system colour keywords, plus a `✓`
glyph on the selected pill so the state survives an OS theme where the fill
reads poorly. Note it sets `background-color` but deliberately *not* `color`:
Chromium paints an opaque backplate behind text in this mode, so
`SelectedItemText` would be invisible against it.

### Running the suite

```bash
npx playwright install chromium     # once
npm run test:e2e
```

The suite builds into `.next-e2e`, not `.next`. That matters: `next build` and
`next dev` otherwise share `.next`, so running the tests while a dev server is
open replaces the chunks underneath it — the page still renders, but the
browser holds script URLs the server no longer has, so React never hydrates and
every control goes dead. If you ever need a production build by hand while a
dev server is running, do the same thing:

```bash
NEXT_DIST_DIR=.next-e2e npm run build
```

`npm run test:e2e` builds, starts a server, and runs every spec **twice** — once
normally and once with `forcedColors: active`. That second project is the whole
point: it is what catches selection and focus states that only exist as colours.

The specs photograph a control before and after selecting it and require the
pixels to change, so they hold regardless of which CSS property carries the
signal. They park the mouse and drop focus first — otherwise a hover border or
focus ring makes the test pass while selection itself stays invisible.

Playwright is a devDependency only. The Docker build sets
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so its browser binaries never enter the
image.

## Spam protection

A honeypot field plus per-IP rate limiting. The limiter is in-memory, so on
serverless each instance counts separately — fine for a low-traffic form. If
this ever attracts real abuse, put [Cloudflare
Turnstile](https://developers.cloudflare.com/turnstile/) in front of the form
or move the limiter to a shared store.

## Docker & Portainer

The image is a multi-stage build on `node:22-alpine` using Next.js
`output: "standalone"` — about 230 MB, running as a non-root user. Secrets are
**never baked in**; `.env*` is in [`.dockerignore`](.dockerignore) and every
value is injected at runtime.

```bash
docker compose up -d --build      # http://localhost:3000
docker compose logs -f web
docker compose down
```

Override the published port with `APP_PORT` (e.g. `APP_PORT=8080`).

### Fail-fast on missing config

`MAILGUN_API_KEY`, `MAILGUN_DOMAIN` and `NOTIFY_TO` use Compose's `${VAR:?}`
syntax, so the stack **refuses to start** if any is unset. MailerLite's
variables are not in that list — with MailerLite optional, Mailgun is the only
thing standing between a submission and the void, so it may not go missing by
accident:

```
error while interpolating services.web.environment.MAILERLITE_API_KEY:
required variable MAILERLITE_API_KEY is missing a value
```

That's intentional. Without it the app boots happily and 502s on every
submission — a loud failure at deploy time beats a quiet one in production. If
Portainer shows that error, fill in the stack's environment variables.

### Three ways to deploy it in Portainer

The stack file is the same in all three; pick by where your Docker host is.

**a. Build on the Docker host, then a web-editor stack.** Simplest when the
repo has no git remote. On the host:

```bash
docker compose build          # produces sfrlf-formsite:latest
```

Then in Portainer → **Stacks → Add stack → Web editor**, paste
[`docker-compose.yml`](docker-compose.yml), delete the `build:` block (the
`image:` line already points at what you just built), and fill in the
environment variables.

**b. Stacks → Repository.** Push this repo somewhere Portainer can reach,
point the stack at it, and set the compose path to `docker-compose.yml`.
Portainer builds from source on deploy — `build:` works as written. Best option
if you want redeploys to track commits.

**c. Registry.** For a remote host that shouldn't build:

```bash
docker build -t ghcr.io/<you>/sfrlf-formsite:latest .
docker push ghcr.io/<you>/sfrlf-formsite:latest
```

Update `image:` to match and drop `build:`.

### Running MailerLite setup in the container

No Node needed on the host — the container already has the script and its
config, and inherits the web service's environment:

```bash
docker exec sfrlf-formsite node scripts/setup-mailerlite.mjs
```

In Portainer that's **Containers → sfrlf-formsite → Console** (`/bin/sh`), then
the same command. Copy the group ID it prints into `MAILERLITE_GROUP_ID` and
redeploy.

### Health & housekeeping

`GET /api/health` returns `{"status":"ok"}` and backs the container
healthcheck (15 s start period, 30 s interval), so Portainer shows a real
health state rather than just "running". It deliberately reports nothing about
your configuration — it's publicly reachable.

Logs are capped at 3 × 10 MB per container. Rebuilds leave dangling images
behind; clear them with `docker image prune -f`.

### Behind a reverse proxy

Rate limiting reads `X-Forwarded-For`, so make sure your proxy sets it —
otherwise every submission looks like it came from the same client and the
5/minute limit becomes global.

## Deploying without Docker

**Vercel** is the path of least resistance: import the repo, paste the
environment variables into Project Settings → Environment Variables, deploy.
The API route runs as a Node serverless function.

Anywhere else that runs Node works too:

```bash
npm run build
npm start        # defaults to port 3000
```

Set the same environment variables in the host's config. Don't ship `.env` —
it's git-ignored on purpose.

## Editing content

Everything text-facing lives in two files:

- [`app/page.tsx`](app/page.tsx) — announcement bar (`ANNOUNCEMENT`, set to
  `null` to hide it), hero copy, the gold message band (`BAND_MESSAGE`), footer.
- [`app/components/SignUpForm.tsx`](app/components/SignUpForm.tsx) — question
  wording, section headings, the privacy line under the submit button.

To change the committee list, edit `COMMITTEES` in
[`lib/form-schema.ts`](lib/form-schema.ts) — the form, validation, and
notification email all read from it.

Colours are Tailwind theme tokens in
[`app/globals.css`](app/globals.css), sampled from the reference screenshots:

| Token | Hex |
| --- | --- |
| `navy` | `#110158` |
| `gold` | `#f4c352` |
| `cream` | `#f4ecd6` |
| `paper` | `#fffdf6` |
| `brick` | `#a8322a` |
| `ink` (body on cream) | `#6b5a2a` |
| `mist` (body on navy) | `#cdc3c0` |

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests: phone formatting + delivery rules |
| `npm run test:e2e` | Playwright suite (selection + keyboard, incl. high contrast) |
| `npm run typecheck:e2e` | Typecheck the Playwright specs |
| `npm run setup:mailerlite` | Create MailerLite fields, list group IDs |
