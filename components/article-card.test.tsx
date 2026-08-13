import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ArticleCard } from "@/components/article-card";
import { bookmarksStore } from "@/hooks/use-bookmarks";
import type { Article } from "@/lib/types";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), message: vi.fn() }),
}));

const article: Article = {
  id: "https://example.com/a",
  title: "Researchers publish an open benchmark",
  description: "A short summary of the article.",
  url: "https://example.com/a",
  image: null,
  publishedAt: new Date().toISOString(),
  source: { name: "The Verge", url: null },
};

describe("ArticleCard", () => {
  it("renders the headline as a link that opens safely in a new tab", () => {
    render(<ArticleCard article={article} />);

    const link = screen.getByRole("link", { name: article.title });
    expect(link).toHaveAttribute("href", article.url);
    expect(link).toHaveAttribute("target", "_blank");
    // Without noopener the opened page can reach back through window.opener.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows the source and description", () => {
    render(<ArticleCard article={article} />);

    expect(screen.getByText("The Verge")).toBeInTheDocument();
    expect(screen.getByText(article.description!)).toBeInTheDocument();
  });

  it("renders a placeholder rather than an image when none is supplied", () => {
    render(<ArticleCard article={article} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("exposes bookmark state through aria-pressed and toggles it", async () => {
    const user = userEvent.setup();
    render(<ArticleCard article={article} />);

    const button = screen.getByRole("button", { name: /bookmark/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(bookmarksStore.getSnapshot().map((a) => a.id)).toEqual([article.id]);
    expect(
      screen.getByRole("button", { name: /remove .* from bookmarks/i }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(bookmarksStore.getSnapshot()).toEqual([]);
  });

  it("omits the description block when the article has none", () => {
    render(<ArticleCard article={{ ...article, description: null }} />);

    expect(screen.queryByText("A short summary of the article.")).not.toBeInTheDocument();
  });
});
