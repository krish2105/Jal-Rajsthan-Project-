import { test, expect, type Page } from "@playwright/test";

async function guestLogin(page: Page, roleIndex = 0) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.locator('input[type="radio"]').nth(roleIndex).check();
  await page.locator('input[type="password"]').fill("JAL2026");
  await page.getByRole("button", { name: /Enter as guest/i }).click();
  await page.waitForURL("**/");
}

test("unauthenticated visitor is redirected to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Guest demo")).toBeVisible();
});

test("public citizen portal is open and searchable", async ({ page }) => {
  await page.goto("/public");
  await expect(page.getByText("जन-पोर्टल")).toBeVisible();
  await page.locator("#q").fill("Jhotwara");
  await expect(page.getByText(/अति-दोहित|over_exploited/).first()).toBeVisible();
});

test("guest secretary: dashboard, KPIs, map render", async ({ page }) => {
  test.setTimeout(150_000);
  await guestLogin(page, 0);
  await expect(page.getByText("Secretary", { exact: false }).first()).toBeVisible();
  await expect(page.locator('[aria-label="Key indicators"] [role="listitem"]').first())
    .toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[aria-label="Rajasthan block map"] canvas'))
    .toBeVisible({ timeout: 30_000 });
  // language toggle to Hindi and back
  await page.getByRole("button", { name: "Toggle language" }).click();
  await expect(page.getByText("डैशबोर्ड").first()).toBeVisible();
});

test("officer sign-in via credentials reaches admin", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByRole("tab", { name: /Officer sign-in/i }).click();
  await page.getByPlaceholder("secretary@jal").fill("secretary@jal");
  await page.getByPlaceholder("Password").fill("jal-secretary-2026");
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL("**/");
  await page.goto("/admin");
  await expect(page.getByText("Structure catalogue")).toBeVisible();
});

test("analyst guest is bounced from admin", async ({ page }) => {
  await guestLogin(page, 2);
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
});

test("aquifer explorer shows history and downloads exist", async ({ page }) => {
  await guestLogin(page, 0);
  await page.goto("/explorer");
  await expect(page.getByText("Aquifer Explorer")).toBeVisible();
  await expect(page.getByText("2026 (forecast)")).toBeVisible();
  await expect(page.getByRole("button", { name: /CSV/ })).toBeVisible();
});

test("copilot opens and replays a recorded run", async ({ page }) => {
  await guestLogin(page, 0);
  await page.locator('[aria-label="Open Policy Copilot"]').click();
  await page.getByText("current groundwater picture").click();
  await expect(page.getByText(/213|recorded/).first()).toBeVisible({ timeout: 30_000 });
});

test("command palette finds a block by name and opens its drawer", async ({ page }) => {
  test.setTimeout(120_000);
  await guestLogin(page);
  await page.locator('[aria-label="Key indicators"]').first().waitFor({ timeout: 30_000 });

  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: /command palette/i });
  await expect(palette).toBeVisible();

  await palette.getByRole("combobox").fill("jhotwara");
  const hit = palette.getByRole("option").first();
  // the block the officer typed is the block that opens — an earlier build
  // resolved the wrong row and showed Talwara for a Jhotwara query
  await expect(hit).toContainText(/Jhotwara/i);
  await hit.click();

  await expect(palette).toBeHidden();
  await expect(page.getByLabel("Jhotwara_Rural details")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Jhotwara_Rural details")).toContainText("Jaipur");
});

test("guided tour walks all 8 steps with the spotlight on screen", async ({ page }) => {
  test.setTimeout(180_000);
  await guestLogin(page);
  await page.locator('[aria-label="Key indicators"]').first().waitFor({ timeout: 30_000 });

  await page.getByRole("button", { name: /start guided tour/i }).click();
  const tour = page.getByRole("dialog", { name: /guided tour/i });
  await expect(tour).toBeVisible();

  for (let step = 1; step <= 8; step++) {
    await expect(tour).toContainText(`Step ${step} of 8`);

    // the spotlight must actually frame something inside the viewport — the
    // failure mode this guards is a collapsed 0x0 ring left over the page
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const ring = document.querySelector<HTMLElement>(".tour-move[aria-hidden]");
            if (!ring) return null;
            const b = ring.getBoundingClientRect();
            const framed = b.width > 20 && b.height > 20;
            const onScreen = b.bottom > 0 && b.top < window.innerHeight;
            return framed && onScreen;
          }),
        { timeout: 20_000, message: `step ${step}: spotlight never framed its target` }
      )
      .toBe(true);

    // and the card must stay fully within the viewport, never clipped off-screen
    const card = await tour.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(card, `step ${step}: card has no box`).not.toBeNull();
    expect(card!.y, `step ${step}: card above the fold`).toBeGreaterThanOrEqual(-1);
    expect(card!.y + card!.height, `step ${step}: card below the fold`).toBeLessThanOrEqual(vh + 1);

    await tour.getByRole("button", { name: step === 8 ? /finish/i : /next/i }).click();
  }

  await expect(tour).toBeHidden();
});

test("agent pipeline answers for the block that was selected", async ({ page }) => {
  test.setTimeout(180_000);
  await guestLogin(page);

  await page.locator("#agents").scrollIntoViewIfNeeded();
  const picker = page.locator("#agents select");
  await picker.waitFor({ timeout: 30_000 });

  const options = await picker.locator("option").allTextContents();
  expect(options.length, "pipeline offers no blocks at all").toBeGreaterThan(0);

  // Prefer a non-default block when more than one run is bundled — the bug this
  // guards is a selection that silently resolved to whichever recording came
  // first, answering a click on Jhotwara with Talwara's briefing and numbers.
  const wanted = options.find((o) => !/talwara/i.test(o)) ?? options[0];
  await picker.selectOption({ label: wanted });

  await page.locator("#agents").getByRole("button", { name: /run the pipeline|पाइपलाइन/i }).click();

  const theatre = page.locator("#agents");
  await expect(
    theatre.getByText(/Hydrologist|जलविज्ञानी|No recorded run for/)
  ).toBeVisible({ timeout: 90_000 });

  // the selection must survive the run, whatever the outcome …
  await expect(picker).toHaveValue(new RegExp(wanted.replace(/ /g, "[ _]"), "i"));
  // … and the UI must never claim to be showing a different block's run
  await expect(theatre).not.toContainText(/showing the recorded run for/i);
});

test("every block offered by a studio can actually be served", async ({ page }) => {
  test.setTimeout(120_000);
  await guestLogin(page);

  for (const section of ["#agents", "#wsp"]) {
    await page.locator(section).scrollIntoViewIfNeeded();
    const select = page.locator(`${section} select`);
    await select.waitFor({ timeout: 30_000 });
    const options = await select.locator("option").allTextContents();
    expect(options.length, `${section} lists no blocks`).toBeGreaterThan(0);
    // a studio must never advertise a block it has nothing to show for
    expect(options.every((o) => o.trim().length > 0), `${section} has a blank option`).toBe(true);
  }
});

test("installable PWA: manifest, icons and a service worker that survives offline", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");

  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");

  const manifest = await (await page.request.get(href!)).json();
  expect(manifest.name).toMatch(/JAL/);
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  // a maskable icon is what stops Android cropping the mark into a circle
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).status(), `${icon.src} missing`).toBe(200);
  }

  // the worker must register and reach "activated", or the offline shell is fiction
  await page.evaluate(() => navigator.serviceWorker.register("/sw.js"));
  // `ready` can resolve while the worker is still "activating" (the activate
  // handler is clearing old caches under waitUntil), so poll for the end state
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration("/");
          return reg?.active?.state ?? "none";
        }),
      { timeout: 20_000, message: "service worker never activated" }
    )
    .toBe("activated");

  // and the offline fallback has to be a real, reachable route
  const offline = await page.request.get("/offline");
  expect(offline.status()).toBe(200);
  expect(await offline.text()).toMatch(/offline/i);
});
