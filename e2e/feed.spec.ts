import { expect, test } from "@playwright/test";

test.describe("news feed", () => {
  test("renders articles on first load", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.getByText("Demo mode.")).toBeVisible();
  });

  test("search updates the feed and the URL", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("article").first()).toBeVisible();

    await page.getByLabel("Search news").fill("quantum");

    await expect(page).toHaveURL(/q=quantum/);
    await expect(
      page.getByRole("heading", { name: /quantum error-correction/i }),
    ).toBeVisible();
  });

  test("a search with no matches shows an empty state, not an error", async ({
    page,
  }) => {
    await page.goto("/?q=zzzznomatchzzzz");

    await expect(page.getByText(/nothing found for/i)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("category chips drive the query and mark themselves active", async ({
    page,
  }) => {
    await page.goto("/");

    const science = page.getByRole("button", { name: "Science", exact: true });
    await science.click();

    await expect(page).toHaveURL(/q=science/);
    await expect(science).toHaveAttribute("aria-pressed", "true");
  });

  test("clearing the search empties the box and restores the default feed", async ({
    page,
  }) => {
    await page.goto("/?q=quantum");

    await page.getByRole("button", { name: "Clear search" }).click();

    await expect(page.getByLabel("Search news")).toHaveValue("");
    // Falling back to the default query means the AI category reads as active.
    await expect(page.getByRole("button", { name: "AI", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("the feed is restored from a shared URL", async ({ page }) => {
    await page.goto("/?q=health&sort=relevance");

    await expect(page.getByLabel("Search news")).toHaveValue("health");
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("scrolling loads another page of articles", async ({ page }) => {
    await page.goto("/?q=news&pageSize=6");
    await expect(page.getByRole("article").first()).toBeVisible();

    const initialCount = await page.getByRole("article").count();

    // scrollTo rather than mouse.wheel: the mobile project emulates a touch
    // device, where wheel events are not delivered.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect
      .poll(() => page.getByRole("article").count(), { timeout: 15_000 })
      .toBeGreaterThan(initialCount);
  });
});
