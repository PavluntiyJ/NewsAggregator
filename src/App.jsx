// src/App.jsx

import React from "react";
import NewsList from "./components/NewsList";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-sm p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">AI News Aggregator</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            A collection of the latest news in the world of technology and
            science.
          </p>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <NewsList />
      </main>
    </div>
  );
}

export default App;
