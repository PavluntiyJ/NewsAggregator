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
