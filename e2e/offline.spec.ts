import { expect, test } from "@playwright/test";

async function waitForServiceWorker(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

test.describe("offline support", () => {
  test("banners the connection dropping while the page is open", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();

    await context.setOffline(true);
    await expect(page.getByText(/you are offline/i)).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByText(/you are offline/i)).toBeHidden();
  });

  test("serves the cached feed after the network goes away", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await waitForServiceWorker(page);
    await page.getByRole("article").first().waitFor();

    await context.setOffline(true);
    await page.reload();

    // The banner is deliberately not asserted here: Chromium reports
    // navigator.onLine as true again on a navigation served from the service
    // worker cache, so this reload cannot exercise it. The previous test covers
    // the banner against a live connection drop instead.
    await expect(page.getByRole("article").first()).toBeVisible();

    await context.setOffline(false);
  });

  // Regression: the worker precached the document but none of the JS, CSS or
  // fonts that render it, so "offline support" was HTML with dead script tags.
  // The suite missed it because a reload straight after an online visit is
  // served from Chromium's own HTTP cache — clearing that is what makes this
  // test actually depend on the service worker.
  test("the shell renders offline once the HTTP cache is gone", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "needs CDP to clear the HTTP cache");

    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await waitForServiceWorker(page);
    await page.getByRole("article").first().waitFor();

    const client = await context.newCDPSession(page);
    await client.send("Network.clearBrowserCache");

    await context.setOffline(true);
    await page.reload();

    // An article can only appear if the React bundle loaded and ran, so this
    // asserts the scripts came from the worker — not merely the HTML.
    await expect(page.getByRole("article").first()).toBeVisible();

    await context.setOffline(false);
  });

  // Regression: cache names were pinned to a hand-maintained "v2.0.0" constant,
  // so they only rotated when somebody remembered to edit it. A response cached
  // by one deployment was then served to a later one whose code expected a
  // different shape. `activate` already deleted unrecognised caches — the names
  // simply never changed. `local` is the build id for a non-Vercel build; see
  // next.config.ts.
  test("caches are namespaced by deployment", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("article").first().waitFor();
    await waitForServiceWorker(page);
    await page.getByRole("article").first().waitFor();

    const keys = await page.evaluate(() => caches.keys());

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key) => !key.endsWith("-local"))).toEqual([]);
  });

  test("bookmarks remain readable offline", async ({ page, context }) => {
    await page.goto("/");
    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: /^bookmark/i })
      .click();

    await waitForServiceWorker(page);
    await page.goto("/bookmarks");

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("article").first()).toBeVisible();

    await context.setOffline(false);
  });
});
