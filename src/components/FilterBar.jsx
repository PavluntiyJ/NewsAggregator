import React from "react";

const categories = ["AI", "Tech", "Science", "Business", "Health"];

const FilterBar = ({ selectedCategory, onCategoryChange, onKeywordChange }) => {
  const [inputValue, setInputValue] = React.useState("");

  // Clear search input and go back to category mode
  const handleClearSearch = () => {
    setInputValue("");
    onKeywordChange(""); // Tell parent component to reset query
  };

  // Update search + possibly override category
  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Notify parent after debounce or immediately
    const timer = setTimeout(() => {
      onKeywordChange(value);
    }, 500);

    return () => clearTimeout(timer);
  };

  const handleCategoryClick = (category) => {
    onCategoryChange(category);
    setInputValue("");
    onKeywordChange(category === "AI" ? "artificial intelligence" : category);
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* Categories */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => {
          // Highlight only if no search is active
          const isSelected = !inputValue && selectedCategory === category;

          return (
            <div
              key={category}
              className="group relative inline-block cursor-pointer"
            >
              <button
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                }`}
              >
                {category}
              </button>

              {/* Tooltip logic */}
              {!isSelected && !inputValue && (
                <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap left-1/2 transform -translate-x-1/2">
                  Show {category} news
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Search Input with ✕ button */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search news..."
          value={inputValue}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Clear Button (✕) */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-8 top-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
