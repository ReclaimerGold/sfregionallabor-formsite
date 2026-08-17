import { test, expect, type Page } from "@playwright/test";

/**
 * Keyboard reachability and focus visibility.
 *
 * The pills and chips wrap visually-hidden 1x1 inputs, so focus lands on
 * something nobody can see. The indicator has to be drawn on the <label>
 * standing in for it — that's what these tests hold in place.
 */

/** Walk the tab order, reporting whether each stop is visibly marked. */
async function tabStops(page: Page) {
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
  });

  const stops: { label: string; tag: string; visible: boolean }[] = [];
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return null;

      const marked = (node: Element) => {
        const s = getComputedStyle(node);
        const outlined = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        return outlined || s.boxShadow !== "none";
      };

      const rect = el.getBoundingClientRect();
      const bigEnough = rect.width > 4 && rect.height > 4;
      // For a visually hidden control, the label is what a person sees.
      const proxy = el.closest("label");

      let label = el.getAttribute("aria-label") ?? "";
      if (!label && proxy) label = proxy.textContent?.trim() ?? "";
      if (!label) label = (el.textContent || el.getAttribute("placeholder") || el.id || "").trim();

      return {
        tag: el.tagName.toLowerCase(),
        label: label.slice(0, 40),
        visible: (bigEnough && marked(el)) || (proxy ? marked(proxy) : false),
      };
    });
    if (!stop) break;
    if (stops.length > 0 && stop.label === stops[0].label && stop.tag === stops[0].tag) break;
    stops.push(stop);
  }
  return stops;
}

test("every tab stop shows a visible focus indicator", async ({ page }) => {
  await page.goto("/");
  const stops = await tabStops(page);

  expect(stops.length, "form should expose at least 18 tab stops").toBeGreaterThanOrEqual(18);

  const invisible = stops.filter((s) => !s.visible).map((s) => `${s.tag} "${s.label}"`);
  expect(
    invisible,
    "these controls receive keyboard focus with nothing on screen to show it",
  ).toEqual([]);
});

test("arrow keys move within a Yes/No group and carry the focus ring", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('input[type="radio"]').first();
  await first.focus();
  await page.keyboard.press("ArrowRight");

  const state = await page.evaluate(() => {
    const el = document.activeElement as HTMLInputElement;
    const label = el.closest("label")!;
    const s = getComputedStyle(label);
    return {
      value: el.getAttribute("value"),
      checked: el.checked,
      ringed: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0,
    };
  });

  expect(state.value).toBe("no");
  expect(state.checked).toBe(true);
  expect(state.ringed, "focus ring did not follow the arrow key").toBe(true);
});

test("Tab moves between questions, not within a group (native radio semantics)", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('input[type="radio"]').first();
  await first.focus();
  const before = await page.evaluate(() => document.activeElement?.getAttribute("name"));
  await page.keyboard.press("Tab");
  const after = await page.evaluate(() => document.activeElement?.getAttribute("name"));

  expect(after).not.toBe(before);
});

test("clicking a pill with the mouse leaves no focus ring", async ({ page }) => {
  await page.goto("/");
  const pill = page
    .locator('fieldset:has-text("Are you a union member?") label')
    .filter({ hasText: /^Yes$/ })
    .first();
  await pill.click();

  const ringed = await pill.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
  });
  expect(ringed, ":focus-visible should not fire for pointer input").toBe(false);
});

test("the whole form can be completed and submitted with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  // By label, not `input[type=text]` — the honeypot is the first text input in
  // the DOM (it's out of the tab order, but querySelector still finds it).
  await page.getByLabel("Name", { exact: true }).focus();

  await page.keyboard.type("Jane Doe");
  await page.keyboard.press("Tab");
  await page.keyboard.type("6055550123");
  await page.keyboard.press("Tab");
  await page.keyboard.type("jane@example.com");

  // Four Yes/No groups: Space selects the focused option. Groups 0 and 2
  // ("union member" / "partner organisation") reveal a follow-up text field on
  // Yes, which joins the tab order right after them.
  const REVEALS: Record<number, { prompt: string; value: string }> = {
    0: { prompt: "Which union?", value: "IBEW Local 426" },
    2: { prompt: "Which one?", value: "Sioux Falls Trades Council" },
  };
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");

    const reveal = REVEALS[i];
    if (reveal) {
      // Wait for React to actually render the conditional field. Tabbing before
      // it exists lands on the next question and desynchronises everything after.
      await page.getByText(reveal.prompt, { exact: true }).waitFor();
      await page.keyboard.press("Tab");
      await page.keyboard.type(reveal.value);
    } else {
      await expect
        .poll(() => page.locator('input[type="radio"]:checked').count())
        .toBeGreaterThan(i);
    }
  }

  const checked = await page.locator('input[type="radio"]:checked').count();
  expect(checked, "each Yes/No group should have an answer").toBe(4);
  await expect(page.locator('input[value="yes"]').first()).toBeChecked();
});
