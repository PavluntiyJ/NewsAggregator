import React from "react";

const NewsItem = ({ article }) => {
  const defaultImage = "./images/placeholder.png"; // Path to your fallback image

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-transform hover:scale-[1.02]">
      {/* Image */}
      <img
        src={article.image || defaultImage}
        alt={article.title}
        className="w-full h-48 object-cover"
        loading="lazy"
        onError={(e) => (e.target.src = defaultImage)}
      />

      {/* Content Container */}
      <div className="p-4 flex flex-col justify-between">
        {" "}
        {/* Added flex-col and justify-between */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {article.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            {article.description || "No description available."}
          </p>
        </div>
        {/* Read more button */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full"
        >
          Read more →
        </a>
      </div>
    </div>
  );
};

export default NewsItem;
