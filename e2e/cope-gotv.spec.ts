import { test, expect, type Page } from "@playwright/test";

/**
 * The COPE Get Out the Vote volunteer form at /cope-gotv.
 *
 * It shares every control primitive with the get-involved form, so the deep
 * focus/selection checks in keyboard.spec.ts and selection.spec.ts cover the
 * pills and chips here too. These tests hold the things specific to this page:
 * the header link, the required-field gate, and the conditional reveals.
 */

function pill(page: Page, question: string, label: RegExp) {
  return page
    .locator(`fieldset:has-text("${question}") label`)
    .filter({ hasText: label })
    .first();
}

/**
 * Chips wrap a visually-hidden checkbox, so Playwright's `check()` can't
 * find anything to click — the label is the thing a person taps.
 */
async function toggleChip(page: Page, label: string | RegExp) {
  await page.locator("label").filter({ hasText: label }).first().click();
}

test("the header links the two forms to each other", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Vote Volunteers" }).click();
  await expect(page).toHaveURL(/\/cope-gotv$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Get Out the Vote/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Get Involved" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("the current page is marked in the nav", async ({ page }) => {
  await page.goto("/cope-gotv");
  await expect(
    page.getByRole("link", { name: "Vote Volunteers" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("link", { name: "Get Involved" }),
  ).not.toHaveAttribute("aria-current", "page");
});

test("state is prefilled with SD", async ({ page }) => {
  await page.goto("/cope-gotv");
  await expect(page.getByLabel("State")).toHaveValue("SD");
});

test("submitting empty flags exactly the required fields", async ({ page }) => {
  await page.goto("/cope-gotv");
  await page.getByRole("button", { name: "Sign me up" }).click();

  await expect(page.getByText("Please check the highlighted fields.")).toBeVisible();
  // Scoped to the form: Next's route announcer is a permanent role="alert".
  const alerts = page.locator("form").getByRole("alert");
  await expect(alerts).toHaveCount(5);
  await expect(page.getByText("Please enter your first name.")).toBeVisible();
  await expect(page.getByText("Please enter your last name.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(
    page.getByText("Please tell us whether you’re a union member."),
  ).toBeVisible();
  await expect(
    page.getByText("Please tell us whether you’re registered to vote."),
  ).toBeVisible();

  // The first invalid control gets focus so keyboard users land on it.
  await expect(page.getByLabel("First name")).toBeFocused();
});

test("union follow-ups appear for every Yes and not for No", async ({ page }) => {
  await page.goto("/cope-gotv");
  const local = page.getByLabel("Union and local number");

  await pill(page, "Are you a union member?", /affiliated with the AFL-CIO$/).click();
  await expect(local).toBeVisible();
  await expect(page.getByLabel("Where do you work?")).toBeVisible();

  await pill(page, "Are you a union member?", /not sure whether/).click();
  await expect(local).toBeVisible();

  await pill(page, "Are you a union member?", /^No — /).click();
  await expect(local).toHaveCount(0);
});

test("registration help shows for No and Not sure, with the state links", async ({
  page,
}) => {
  await page.goto("/cope-gotv");
  const helpBox = page.getByText("South Dakota does not register voters online");

  await pill(page, "Are you registered to vote?", /^Yes$/).click();
  await expect(helpBox).toHaveCount(0);

  await pill(page, "Are you registered to vote?", /^No$/).click();
  await expect(helpBox).toBeVisible();

  const form = page.getByRole("link", { name: "Download the voter registration form" });
  await expect(form).toHaveAttribute("href", /sdsos\.gov/);
  await expect(form).toHaveAttribute("target", "_blank");
  await expect(form).toHaveAttribute("rel", /noopener/);
  await expect(
    page.getByRole("link", { name: "Check whether you’re already registered" }),
  ).toHaveAttribute("href", "https://vip.sdsos.gov/");

  const help = page.getByLabel("Have someone help me get registered");
  await expect(help).not.toBeChecked();
  await toggleChip(page, "Have someone help me get registered");
  await expect(help).toBeChecked();

  await pill(page, "Are you registered to vote?", /not sure/).click();
  await expect(helpBox).toBeVisible();
});

test("creative idea and business reveals require their follow-ups", async ({ page }) => {
  await page.goto("/cope-gotv");
  // Zod only runs the cross-field checks once every field parses on its own,
  // so the required fields have to be in place for the follow-up errors to show.
  await page.getByLabel("First name").fill("Jane");
  await page.getByLabel("Last name").fill("Doe");
  await page.getByRole("textbox", { name: /^Email/ }).fill("jane@example.com");
  await pill(page, "Are you a union member?", /^No — /).click();
  await pill(page, "Are you registered to vote?", /^Yes$/).click();

  await pill(page, "creative idea", /^Yes$/).click();
  await expect(page.getByLabel("Tell us about it")).toBeVisible();

  await pill(page, "business or a third space", /^Yes$/).click();
  await expect(page.getByLabel("Name of the business or space")).toBeVisible();
  await expect(page.getByLabel("Where is it?")).toBeVisible();
  for (const offer of [
    "Putting out voter information or literature",
    "Hosting a voter registration table",
    "Hosting a forum, meeting, or candidate event",
    "Being a launch site for canvasses",
    "Donating food, space, or services for volunteer shifts",
  ]) {
    await expect(page.getByLabel(offer)).toBeAttached();
  }

  await page.getByRole("button", { name: "Sign me up" }).click();
  await expect(page.getByText("Tell us a little about your idea.")).toBeVisible();
  await expect(
    page.getByText("Please tell us the name of the business or space."),
  ).toBeVisible();

  // Switching back to No takes the follow-ups (and their errors) away.
  await pill(page, "creative idea", /^No$/).click();
  await expect(page.getByLabel("Tell us about it")).toHaveCount(0);
});

test("all twelve ways to help are offered and can be toggled", async ({ page }) => {
  await page.goto("/cope-gotv");
  const chips = page.locator('fieldset:has-text("ways you\'d like to pitch in") input[type="checkbox"]');
  await expect(chips).toHaveCount(12);

  const doors = page.getByLabel("Knocking doors");
  await toggleChip(page, "Knocking doors");
  await expect(doors).toBeChecked();
  await toggleChip(page, "Knocking doors");
  await expect(doors).not.toBeChecked();
});

test("a valid submission reaches the API and shows the success panel", async ({
  page,
}) => {
  // Playwright's server runs with every vendor key blanked, so the real route
  // would 502. Stub it to confirm the client sends what the schema expects.
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/cope-gotv", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/cope-gotv");
  await page.getByLabel("First name").fill("Jane");
  await page.getByLabel("Last name").fill("Doe");
  await page.getByRole("textbox", { name: /^Email/ }).fill("jane@example.com");
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill("6055550123");
  await pill(page, "Are you a union member?", /^No — /).click();
  await pill(page, "Are you registered to vote?", /^Yes$/).click();
  await toggleChip(page, "Phone banking");
  await toggleChip(page, /You can text me/);
  await page.getByRole("button", { name: "Sign me up" }).click();

  await expect(page.getByText("Thanks — you’re on the team.")).toBeVisible();
  expect(body).toMatchObject({
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "+16055550123",
    state: "SD",
    unionStatus: "no",
    voterStatus: "yes",
    activities: ["Phone banking"],
    smsConsent: true,
    website: "",
  });
});
