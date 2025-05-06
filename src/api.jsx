// src/api.jsx

import axios from "axios";

const BASE_URL = "https://gnews.io/api/v4/search";
const API_KEY = import.meta.env.VITE_GNEWS_API_KEY;

export const fetchNews = async (
  query = "artificial intelligence",
  page = 1
) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        q: query,
        token: API_KEY,
        lang: "en",
        max: 10,
        page,
      },
    });

    return {
      articles: response.data.articles || [],
      totalResults: response.data.totalArticles || 0,
    };
  } catch (error) {
    console.error("Error loading news:", error.message);
    throw new Error(error.response?.status + ": " + error.message);
  }
};
