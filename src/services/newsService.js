// src/services/newsService.js
import { newsApiConfig } from '../config';

const NEWS_API_KEY = newsApiConfig.apiKey;
const NEWS_API_URL = "https://gnews.io/api/v4/search";

export const fetchNews = async (page = 1) => {
    // A broader query to ensure results are returned
    const keywords = "education OR jobs";
    const language = "en";
    const pageSize = 10;
    
    // GNews API uses a 'page' parameter for pagination.
    const url = `${NEWS_API_URL}?q=${encodeURIComponent(keywords)}&lang=${language}&page=${page}&token=${NEWS_API_KEY}&max=${pageSize}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const articles = data.articles.map(article => ({
            title: article.title,
            description: article.description || "No description available.",
            url: article.url,
            source: article.source.name,
            image_url: article.image || 'https://placehold.co/600x400/1e293b/a8a29e?text=No+Image'
        }));

        const totalResults = data.totalArticles;
        const hasMore = (page * pageSize) < totalResults;

        return {
            articles: articles,
            nextPage: hasMore ? page + 1 : null
        };
    } catch (error) {
        console.error("Error fetching news:", error);
        throw error;
    }
};