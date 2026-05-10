import { test, expect } from "@playwright/test";

test.describe("Login redirect", () => {
  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL((url) => url.pathname === "/login");
    await expect(page.getByRole("button", { name: /Continue with secure sign-in/i })).toBeVisible();
  });

  test("login page shows MFA messaging", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/Multi-factor authentication is required/i)).toBeVisible();
  });
});
