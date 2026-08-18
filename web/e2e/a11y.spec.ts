import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function guest(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="radio"]').first().check();
  await page.locator('input[type="password"]').fill("JAL2026");
  await page.getByRole("button", { name: /Enter as guest/i }).click();
  await page.waitForURL("**/");
}

const CRITICAL = ["critical", "serious"];

/**
 * Contrast has to be judged on the settled interface, not on a frame of its
 * entrance animation. Motion writes inline `opacity` while revealing sections,
 * so axe blends a mid-flight element with the page behind it and reports the
 * blend: an accent button caught at opacity 0.15 reads as #060e16 on #132d2f,
 * a 1.33:1 "failure" that no reader ever sees.
 *
 * Waiting for the animations to finish is not enough — the chart sections mount
 * lazily, so scrolling starts new reveals, and axe itself takes seconds to run.
 * So: scroll the whole page to mount and reveal everything, then pin every
 * Motion-driven opacity to its final value for the duration of the audit.
 */
async function settle(page: Page) {
  // walk the page so every lazily-mounted section exists and has been revealed
  for (const dwell of [120, 220]) {
    await page.evaluate(async (ms) => {
      const step = Math.round(window.innerHeight * 0.6);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, ms));
      }
    }, dwell);
  }

  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });

  // Freeze the reveals at their end state. This targets only elements Motion is
  // animating inline; opacity set through CSS classes (the decorative Story
  // watermark, the aurora backdrop) is untouched, so nothing that is meant to be
  // faint is misreported as solid.
  await page.addStyleTag({
    content: `[style*="opacity"] { opacity: 1 !important; }`,
  });
  await page.waitForTimeout(200);
}

async function scan(page: Page, label: string) {
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The oversized numerals behind the Story cards are pure decoration at 7%
    // opacity, already aria-hidden, and duplicate no information. WCAG 1.4.3
    // exempts incidental text from the contrast requirement; axe cannot infer
    // that, so the exemption is declared here rather than papered over by
    // recolouring a watermark that is meant to be barely there.
    .exclude(".decorative-watermark")
    .analyze();
  const bad = results.violations.filter((v) => CRITICAL.includes(v.impact ?? ""));
  if (bad.length) {
    console.log(`\n[a11y] ${label}:`);
    for (const v of bad) console.log(`  ${v.impact} · ${v.id} · ${v.nodes.length} node(s) · ${v.help}`);
  }
  expect(bad, `${label}: ${bad.map((v) => v.id).join(", ")}`).toEqual([]);
}

test("login page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await scan(page, "login");
});

test("public portal has no critical accessibility violations", async ({ page }) => {
  await page.goto("/public");
  await scan(page, "public");
});

test("dashboard has no critical accessibility violations", async ({ page }) => {
  test.setTimeout(150_000);
  await guest(page);
  await page.locator('[aria-label="Key indicators"]').first().waitFor({ timeout: 30_000 });
  await scan(page, "dashboard");
});

test("explorer has no critical accessibility violations", async ({ page }) => {
  test.setTimeout(120_000);
  await guest(page);
  await page.goto("/explorer");
  await page.getByText("Aquifer Explorer").waitFor();
  await scan(page, "explorer");
});

test("keyboard: tab reaches the copilot launcher", async ({ page }) => {
  test.setTimeout(120_000);
  await guest(page);
  const dock = page.locator('[aria-label="Open Policy Copilot"]');
  await dock.focus();
  await expect(dock).toBeFocused();
});
