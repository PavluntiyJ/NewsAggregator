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

  // Regression: the search debounce was uncancellable, so a category picked
  // within its 350 ms window fired afterwards and navigated back to the typed
  // term — leaving the URL, the search box and the active chip disagreeing.
  // Only a real browser reproduces it; every unit test drove one input at a time.
  test("a category clicked mid-typing wins over the pending search", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("article").first()).toBeVisible();

    await page.getByLabel("Search news").pressSequentially("fusion", { delay: 20 });

    const science = page.getByRole("button", { name: "Science", exact: true });
    await science.click();

    // Well past the debounce: if it were still armed, it would have fired.
    await page.waitForTimeout(800);

    await expect(page).toHaveURL(/q=science/);
    await expect(page.getByLabel("Search news")).toHaveValue("science");
    await expect(science).toHaveAttribute("aria-pressed", "true");
  });

  // Same race against the clear button, which is the other immediate write.
  test("clearing mid-typing is not undone by the pending search", async ({ page }) => {
    await page.goto("/?q=quantum");

    await page.getByLabel("Search news").pressSequentially("fusion", { delay: 20 });
    await page.getByRole("button", { name: "Clear search" }).click();

    await page.waitForTimeout(800);

    await expect(page.getByLabel("Search news")).toHaveValue("");
    await expect(page).not.toHaveURL(/q=fusion/);
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

  // Regression: an empty box falls back to the default query for the *URL*,
  // and that fallback used to be recorded as a search the reader had made —
  // planting "artificial intelligence" in the datalist and the palette's
  // recents forever. The clear button dodged it by bypassing pushQuery; a
  // backspace did not.
  test("backspacing to empty records no search", async ({ page }) => {
    await page.goto("/");
    const box = page.getByLabel("Search news");

    await box.fill("quantum");
    await expect(page).toHaveURL(/q=quantum/);

    await box.fill("");
    await expect(page.getByRole("button", { name: "AI", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const history = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("news-aggregator:search-history:v1") ?? "[]"),
    );
    expect(history).toEqual(["quantum"]);
    await expect(page.locator("#search-history option")).toHaveCount(1);
  });

  // Sort, language and country are mutually exclusive: checkboxes announced
  // sixteen independent toggles for what are really three radio groups.
  test("the filter menu exposes radio groups, not checkboxes", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Filters" }).click();

    await expect(page.getByRole("menuitemcheckbox")).toHaveCount(0);
    const newest = page.getByRole("menuitemradio", { name: "Newest first" });
    await expect(newest).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("menuitemradio", { name: "Most relevant" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  test("reset filters returns the feed to its defaults", async ({ page }) => {
    await page.goto("/?sort=relevance&country=us");

    const filters = page.getByRole("button", { name: "Filters" });
    await expect(filters).toContainText("2");

    await filters.click();
    await page.getByRole("menuitem", { name: "Reset filters" }).click();

    await expect(page).not.toHaveURL(/sort=|country=/);
    await expect(filters).not.toContainText("2");
  });

  test("reset filters is inert when nothing is set", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Filters" }).click();

    await expect(
      page.getByRole("menuitem", { name: "Reset filters" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  // Refresh means "the newest page", not "replay my whole scroll history":
  // refetching an infinite query costs one upstream request per cached page.
  test("refresh collapses a scrolled feed back to one page", async ({ page }) => {
    await page.goto("/?q=news&pageSize=6");
    await expect(page.getByRole("article").first()).toBeVisible();

    const initialCount = await page.getByRole("article").count();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() => page.getByRole("article").count(), { timeout: 15_000 })
      .toBeGreaterThan(initialCount);

    await page.getByRole("button", { name: "Refresh" }).click();

    await expect.poll(() => page.getByRole("article").count()).toBe(initialCount);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // A new query replaces every result, so the old offset means nothing — and a
  // sentinel left in view would immediately page through content nobody asked
  // for.
  test("a new search returns the reader to the top", async ({ page }) => {
    await page.goto("/?q=news&pageSize=6");
    await expect(page.getByRole("article").first()).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.getByLabel("Search news").fill("quantum");
    await expect(page).toHaveURL(/q=quantum/);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
