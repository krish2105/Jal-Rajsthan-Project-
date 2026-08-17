# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: jal.spec.ts >> officer sign-in via credentials reaches admin
- Location: e2e/jal.spec.ts:38:5

# Error details

```
Test timeout of 150000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 150000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/" until "load"
  navigated to "http://localhost:3777/api/auth/error"
============================================================
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - heading "Server error" [level=1] [ref=f1e4]
  - generic [ref=f1e6]:
    - paragraph [ref=f1e7]: There is a problem with the server configuration.
    - paragraph [ref=f1e8]: Check the server logs for more information.
```

# Test source

```ts
  1  | import { test, expect, type Page } from "@playwright/test";
  2  | 
  3  | async function guestLogin(page: Page, roleIndex = 0) {
  4  |   await page.goto("/");
  5  |   await expect(page).toHaveURL(/\/login/);
  6  |   await page.locator('input[type="radio"]').nth(roleIndex).check();
  7  |   await page.locator('input[type="password"]').fill("JAL2026");
  8  |   await page.getByRole("button", { name: /Enter as guest/i }).click();
  9  |   await page.waitForURL("**/");
  10 | }
  11 | 
  12 | test("unauthenticated visitor is redirected to login", async ({ page }) => {
  13 |   await page.goto("/");
  14 |   await expect(page).toHaveURL(/\/login/);
  15 |   await expect(page.getByText("Guest demo")).toBeVisible();
  16 | });
  17 | 
  18 | test("public citizen portal is open and searchable", async ({ page }) => {
  19 |   await page.goto("/public");
  20 |   await expect(page.getByText("जन-पोर्टल")).toBeVisible();
  21 |   await page.locator("#q").fill("Jhotwara");
  22 |   await expect(page.getByText(/अति-दोहित|over_exploited/).first()).toBeVisible();
  23 | });
  24 | 
  25 | test("guest secretary: dashboard, KPIs, map render", async ({ page }) => {
  26 |   test.setTimeout(150_000);
  27 |   await guestLogin(page, 0);
  28 |   await expect(page.getByText("Secretary", { exact: false }).first()).toBeVisible();
  29 |   await expect(page.locator('[aria-label="Key indicators"] [role="listitem"]').first())
  30 |     .toBeVisible({ timeout: 20_000 });
  31 |   await expect(page.locator('[aria-label="Rajasthan block map"] canvas'))
  32 |     .toBeVisible({ timeout: 30_000 });
  33 |   // language toggle to Hindi and back
  34 |   await page.getByRole("button", { name: "हिन्दी" }).click();
  35 |   await expect(page.getByText("डैशबोर्ड").first()).toBeVisible();
  36 | });
  37 | 
  38 | test("officer sign-in via credentials reaches admin", async ({ page }) => {
  39 |   test.setTimeout(150_000);
  40 |   await page.goto("/login");
  41 |   await page.getByRole("tab", { name: /Officer sign-in/i }).click();
  42 |   await page.getByPlaceholder("secretary@jal").fill("secretary@jal");
  43 |   await page.getByPlaceholder("Password").fill("jal-secretary-2026");
  44 |   await page.getByRole("button", { name: /^Sign in$/i }).click();
> 45 |   await page.waitForURL("**/");
     |              ^ Error: page.waitForURL: Test timeout of 150000ms exceeded.
  46 |   await page.goto("/admin");
  47 |   await expect(page.getByText("Structure catalogue")).toBeVisible();
  48 | });
  49 | 
  50 | test("analyst guest is bounced from admin", async ({ page }) => {
  51 |   await guestLogin(page, 2);
  52 |   await page.goto("/admin");
  53 |   await expect(page).not.toHaveURL(/\/admin/);
  54 | });
  55 | 
  56 | test("aquifer explorer shows history and downloads exist", async ({ page }) => {
  57 |   await guestLogin(page, 0);
  58 |   await page.goto("/explorer");
  59 |   await expect(page.getByText("Aquifer Explorer")).toBeVisible();
  60 |   await expect(page.getByText("2026 (forecast)")).toBeVisible();
  61 |   await expect(page.getByRole("button", { name: /CSV/ })).toBeVisible();
  62 | });
  63 | 
  64 | test("copilot opens and replays a recorded run", async ({ page }) => {
  65 |   await guestLogin(page, 0);
  66 |   await page.locator('[aria-label="Open Policy Copilot"]').click();
  67 |   await page.getByText("current groundwater picture").click();
  68 |   await expect(page.getByText(/213|recorded/).first()).toBeVisible({ timeout: 30_000 });
  69 | });
  70 | 
```