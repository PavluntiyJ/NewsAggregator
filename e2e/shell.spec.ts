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

  // Chrome wants raster 192/512 before it offers an install prompt, and Safari
  // reads none of the manifest — only the apple-touch-icon link.
  test("the manifest ships the raster icons browsers require", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();

    const sizes = (purpose: string) =>
      manifest.icons
        .filter(
          (icon: { type: string; purpose: string }) =>
            icon.type === "image/png" && icon.purpose === purpose,
        )
        .map((icon: { sizes: string }) => icon.sizes)
        .sort();

    expect(sizes("any")).toEqual(["192x192", "512x512"]);
    expect(sizes("maskable")).toEqual(["192x192", "512x512"]);

    for (const icon of manifest.icons) {
      const response = await request.get(icon.src);
      expect(response.ok(), `${icon.src} is served`).toBe(true);
    }
  });

  test("iOS gets an apple-touch-icon", async ({ page, request }) => {
    await page.goto("/");

    const href = await page
      .locator('link[rel="apple-touch-icon"]')
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();
    expect((await request.get(href!)).ok()).toBe(true);
  });

  // The bookmarks page is a client component and cannot export metadata; a
  // server layout for the segment is what keeps the tab from reading "The
  // Feed" on every route.
  test("the bookmarks segment sets its own title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/The Feed/);

    await page.goto("/bookmarks");
    await expect(page).toHaveTitle(/^Bookmarks/);
  });

  test("link unfurls have an image to show", async ({ page, request }) => {
    await page.goto("/");

    const content = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(content).toBeTruthy();

    // metadataBase makes this absolute against the deployed origin, which is
    // not the ephemeral server under test — only the path is ours to fetch.
    const response = await request.get(new URL(content!).pathname);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/");
  });
});
