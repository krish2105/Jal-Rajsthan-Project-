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
