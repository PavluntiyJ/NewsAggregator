import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("the command palette opens with the keyboard and runs a search", async ({
    page,
    isMobile,
  }) => {
    // ⌘K is a desktop affordance; touch devices reach the palette by tapping
    // the search button, which the next test covers.
    test.skip(!!isMobile, "keyboard shortcut is desktop-only");

    await page.goto("/");
    await expect(page.getByRole("article").first()).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");

    const palette = page.getByRole("dialog");
    await expect(palette).toBeVisible();

    await palette.getByPlaceholder("Search news or jump to…").fill("fusion");
    await page.keyboard.press("Enter");

    await expect(palette).toBeHidden();
    await expect(page).toHaveURL(/q=fusion/);
  });

  test("the search button opens the palette on any device", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open search" })
      .filter({ visible: true })
      .click();

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("the palette navigates to bookmarks", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open search" })
      .filter({ visible: true })
      .click();
    await page.getByRole("option", { name: /^Bookmarks$/ }).click();

    await expect(page).toHaveURL(/\/bookmarks/);
  });

  test("Escape closes the palette", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open search" })
      .filter({ visible: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("theme switches to dark and survives a reload", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /^theme:/i }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("the skip link is reachable by keyboard", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");

    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("an unknown route renders the 404 page", async ({ page }) => {
    await page.goto("/no-such-page");

    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("the web manifest is served for installability", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.ok()).toBe(true);
    expect((await response.json()).name).toContain("The Feed");
  });
});
