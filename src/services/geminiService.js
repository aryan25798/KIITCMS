// src/services/geminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiConfig } from '../config';

// Use the API key from the config file
const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

export const summarizeNews = async (title, description, url) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // The prompt is designed to be concise and relevant for a student audience.
    const prompt = `Summarize the following news article for a college student, focusing on key takeaways related to academics, innovation, or career opportunities. Keep the summary to a maximum of 50 words.
    
    Article Title: ${title}
    Article Description: ${description}
    Article URL: ${url}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error summarizing news with Gemini:", error);
        throw new Error("Failed to generate summary with Gemini.");
    }
};
