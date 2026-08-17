import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * "Is there any visible indication that this control is selected?"
 *
 * The pills and chips are styled <label>s wrapping visually-hidden inputs, so
 * `input.checked` being true proves nothing about what a person can see. These
 * tests photograph the same control before and after selecting it and require
 * the pixels to change — which holds no matter which CSS property carries the
 * signal, and fails in Windows High Contrast mode if the only signal is a
 * background colour the OS discards.
 */

const YES_NO_QUESTIONS = [
  "Are you a union member?",
  "Are you a retired union member?",
  "would want to work with the labor federation?",
  "Are you interested in volunteering?",
];

const COMMITTEES = [
  "Organizing",
  "Legislative",
  "Education and Training",
  "Community Services",
  "Communications",
  "Events",
  "Young Workers",
];

/**
 * Park the mouse and drop focus. Without this, a hover border or a focus ring
 * changes the pixels and the test passes even when selection itself is
 * invisible — the exact false green we're guarding against.
 */
async function settle(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(120);
}

/** Everything that paints this element, as one comparable string. */
function paintOf(target: Locator) {
  return target.evaluate((el) => {
    const s = getComputedStyle(el);
    return [
      s.backgroundColor,
      s.color,
      s.borderColor,
      s.borderWidth,
      s.outlineColor,
      s.outlineStyle,
      s.outlineWidth,
      s.boxShadow,
    ].join(" | ");
  });
}

function yesNoPill(page: Page, question: string, option: "Yes" | "No") {
  return page
    .locator(`fieldset:has-text("${question}") label`)
    .filter({ hasText: new RegExp(`^${option}$`) })
    .first();
}

function committeeChip(page: Page, committee: string) {
  return page
    .locator("label")
    .filter({ hasText: new RegExp(`^${committee}$`) })
    .first();
}

test.describe("Yes/No pills", () => {
  for (const question of YES_NO_QUESTIONS) {
    test(`selecting Yes visibly changes the pill — "${question}"`, async ({ page }) => {
      await page.goto("/");
      const yes = yesNoPill(page, question, "Yes");
      await yes.scrollIntoViewIfNeeded();
      await settle(page);

      const before = await yes.screenshot();
      await yes.click();
      await settle(page);

      await expect(yes.locator("input")).toBeChecked();

      const after = await yes.screenshot();
      expect(
        after.equals(before),
        "the selected pill renders identically to how it looked unselected — a sighted user cannot tell it is chosen",
      ).toBe(false);
    });

    test(`selected and unselected pills differ — "${question}"`, async ({ page }) => {
      await page.goto("/");
      const yes = yesNoPill(page, question, "Yes");
      const no = yesNoPill(page, question, "No");
      await yes.scrollIntoViewIfNeeded();
      await yes.click();
      await settle(page);

      expect(
        await paintOf(yes),
        "selected pill paints the same as its unselected sibling",
      ).not.toBe(await paintOf(no));
    });
  }

  test("selected pill carries a non-colour marker in high contrast", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "forced-colors",
      "the marker only renders under forced-colors",
    );
    await page.goto("/");
    const yes = yesNoPill(page, YES_NO_QUESTIONS[0], "Yes");
    const no = yesNoPill(page, YES_NO_QUESTIONS[0], "No");
    await yes.click();
    await settle(page);

    const marker = (target: Locator) =>
      target.evaluate((el) => getComputedStyle(el, "::before").content);

    // Colour alone can't be trusted across OS themes, so selection also has to
    // be readable as a glyph.
    expect(await marker(yes)).toContain("✓");
    expect(await marker(no)).not.toContain("✓");
  });

  test("switching from Yes to No moves the indication", async ({ page }) => {
    await page.goto("/");
    const question = YES_NO_QUESTIONS[0];
    const yes = yesNoPill(page, question, "Yes");
    const no = yesNoPill(page, question, "No");

    await yes.click();
    await settle(page);
    const yesSelected = await paintOf(yes);

    await no.click();
    await settle(page);

    expect(await paintOf(no)).toBe(yesSelected);
    expect(await paintOf(yes)).not.toBe(yesSelected);
    await expect(yes.locator("input")).not.toBeChecked();
  });
});

test.describe("Committee chips", () => {
  for (const committee of COMMITTEES) {
    test(`checking "${committee}" visibly changes the chip`, async ({ page }) => {
      await page.goto("/");
      const chip = committeeChip(page, committee);
      await chip.scrollIntoViewIfNeeded();
      await settle(page);

      const before = await chip.screenshot();
      await chip.click();
      await settle(page);

      await expect(chip.locator("input")).toBeChecked();

      const after = await chip.screenshot();
      expect(
        after.equals(before),
        "the checked chip renders identically to how it looked unchecked",
      ).toBe(false);
    });
  }

  test("unchecking restores the original appearance", async ({ page }) => {
    await page.goto("/");
    const chip = committeeChip(page, "Organizing");
    await chip.scrollIntoViewIfNeeded();
    await settle(page);

    const unchecked = await chip.screenshot();
    await chip.click();
    await settle(page);
    await chip.click();
    await settle(page);

    await expect(chip.locator("input")).not.toBeChecked();
    expect((await chip.screenshot()).equals(unchecked)).toBe(true);
  });
});
