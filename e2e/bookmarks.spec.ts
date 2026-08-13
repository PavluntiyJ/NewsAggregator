import { expect, test } from "@playwright/test";

test.describe("bookmarks", () => {
  test("saving an article persists it across a reload", async ({ page }) => {
    await page.goto("/");

    const firstArticle = page.getByRole("article").first();
    const title = await firstArticle.getByRole("heading").innerText();

    await firstArticle.getByRole("button", { name: /^bookmark/i }).click();
    await expect(page.getByText("Saved to bookmarks")).toBeVisible();

    await page.reload();
    await page.goto("/bookmarks");

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("the header badge tracks the saved count", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: /^bookmark/i })
      .click();

    await expect(page.getByRole("link", { name: /bookmarks \(1 saved\)/i })).toBeVisible();
  });

  test("removing a bookmark empties the page", async ({ page }) => {
    await page.goto("/");

    const article = page.getByRole("article").first();
    await article.getByRole("button", { name: /^bookmark/i }).click();

    await page.goto("/bookmarks");
    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: /remove .* from bookmarks/i })
      .click();

    await expect(page.getByText("No bookmarks yet")).toBeVisible();
  });

  test("an empty bookmarks page invites the reader back to the feed", async ({
    page,
  }) => {
    await page.goto("/bookmarks");

    await expect(page.getByText("No bookmarks yet")).toBeVisible();
    await page.getByRole("link", { name: "Browse the feed" }).click();

    await expect(page.getByRole("article").first()).toBeVisible();
  });
});
