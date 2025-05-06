import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const maxPagesToShow = 5;

  // Generate list of pages to show
  const getPages = () => {
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let left = Math.max(2, currentPage - 2);
    let right = Math.min(totalPages - 1, currentPage + 2);

    const pages = [1];

    if (left > 2) {
      pages.push("...");
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-wrap justify-center gap-1 mt-6">
      {/* Previous Button */}
      {currentPage > 1 && (
        <div className="group relative">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className="mx-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition cursor-pointer"
            aria-label="Previous Page"
          >
            ←
          </button>
          <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap left-1/2 transform -translate-x-1/2">
            Go to previous page
          </span>
        </div>
      )}

      {/* Page Buttons with Conditional Tooltips */}
      {getPages().map((page, idx) => {
        if (page === "...") {
          return (
            <span key={idx} className="mx-1 px-3 py-1">
              ...
            </span>
          );
        }

        // Don't allow clicking on current page
        const isCurrent = currentPage === page;
        const isFirst = page === 1;
        const isLast = page === totalPages;

        let tooltipText = "";
        if (isCurrent) {
          tooltipText = "";
        } else if (isFirst) {
          tooltipText = "Go to first page";
        } else if (isLast) {
          tooltipText = "Go to last page";
        } else {
          tooltipText = `Go to page ${page}`;
        }

        return (
          <div
            key={idx}
            className={`group relative ${
              isCurrent ? "cursor-default" : "cursor-pointer"
            }`}
          >
            <button
              onClick={() => !isCurrent && onPageChange(page)}
              disabled={isCurrent}
              className={`mx-1 px-3 py-1 rounded transition-all ${
                isCurrent
                  ? "bg-blue-600 text-white scale-105"
                  : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              }`}
            >
              {page}
            </button>

            {/* Show tooltip only if not current page */}
            {!isCurrent && tooltipText && (
              <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap left-1/2 transform -translate-x-1/2">
                {tooltipText}
              </span>
            )}
          </div>
        );
      })}

      {/* Next Button */}
      {currentPage < totalPages && (
        <div className="group relative">
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="mx-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition cursor-pointer"
            aria-label="Next Page"
          >
            →
          </button>
          <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap left-1/2 transform -translate-x-1/2">
            Go to next page
          </span>
        </div>
      )}
    </div>
  );
};

export default Pagination;
