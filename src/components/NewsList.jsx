import React, { useEffect, useState } from "react";
import { fetchNews } from "../api";
import NewsItem from "./NewsItem";
import FilterBar from "./FilterBar";
import LoadingIndicator from "./LoadingIndicator";
import Pagination from "./Pagination";

const NewsList = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("AI");
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("Artificial Intelligence");

  const pageSize = 10;

  useEffect(() => {
    if (!keyword.trim()) {
      setSearchQuery(
        selectedCategory === "AI" ? "artificial intelligence" : selectedCategory
      );
      return;
    }

    const timer = setTimeout(() => {
      setSearchQuery(keyword);
    }, 1000);

    return () => clearTimeout(timer);
  }, [keyword, selectedCategory]);

  useEffect(() => {
    if (!searchQuery && selectedCategory === "AI") {
      setSearchQuery("artificial intelligence");
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const getNews = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchNews(searchQuery, currentPage);

        if (!data.articles.length) {
          if (data.totalResults === 0) {
            setErrorMessage(`No news on request "${searchQuery}"`);
          } else {
            setErrorMessage(`There is no news on this page.`);
          }
        }

        setArticles(data.articles || []);
        setTotalResults(data.totalResults || 0);
      } catch (error) {
        console.error("Loading error:", error.message);

        if (
          error.message.includes("429") ||
          error.message.includes("rate limit")
        ) {
          setErrorMessage("Too many requests. Please wait a bit.");
        } else {
          setErrorMessage(`Failed to load news: ${searchQuery}`);
        }

        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    getNews();
  }, [searchQuery, currentPage]);

  const totalPages = Math.min(Math.ceil(totalResults / pageSize), 10);

  return (
    <div>
      <FilterBar
        selectedCategory={selectedCategory}
        onCategoryChange={(category) => {
          setSelectedCategory(category);
          setKeyword("");
        }}
        onKeywordChange={setKeyword}
      />

      {/* News grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center h-40">
            <LoadingIndicator />
          </div>
        ) : errorMessage ? (
          <p className="col-span-full text-center py-8 text-gray-500">
            {errorMessage}
          </p>
        ) : articles.length > 0 ? (
          articles.map((article, index) => (
            <NewsItem key={index} article={article} />
          ))
        ) : (
          <p className="col-span-full text-center py-8 text-gray-500">
            No news
          </p>
        )}
      </div>

      {/* Pagination */}
      {!loading && !errorMessage && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Try again button */}
      {errorMessage && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => {
              if (errorMessage.includes("rate limit")) {
                alert("Please wait a bit before the next request.");
              } else {
                const query = searchQuery || selectedCategory;
                setSearchQuery(query);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsList;
