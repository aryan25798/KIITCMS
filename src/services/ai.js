import { geminiConfig } from '../config';

// WARNING: Your Gemini API key is exposed here. This is not secure.
const GEMINI_API_KEY = geminiConfig.apiKey;

// ✅ FIXED API URL
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;


async function generateText(prompt) {
    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ]
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();

    // Google’s response correct structure
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export const AI_HELPERS = {

    async getCategoryAndPriority(description) {
        const prompt = `Analyze the following user complaint and return a JSON object with "category", "priority", and "assignedDept".
        Categories can be: "Hostel", "Mess", "Network", "Academic", "Infrastructure", "Other".
        Priority can be: "Low", "Medium", "High".
        Based on the category, assign to: "IT Department", "Maintenance", "Hostel Affairs", "Academics", "Unassigned".
        Complaint: "${description}"`;

        try {
            const response = await generateText(prompt);
            const jsonString = response.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonResponse = JSON.parse(jsonString);

            const priority = jsonResponse.priority || "Low";
            const priorityLevel = { High: 1, Medium: 2, Low: 3 }[priority];

            return {
                category: jsonResponse.category || "Other",
                priority,
                priorityLevel,
                assignedDept: jsonResponse.assignedDept || "Unassigned"
            };
        } catch (error) {
            console.error("AI Categorization Error:", error);
            return { category: "Other", priority: "Low", priorityLevel: 3, assignedDept: "Unassigned" };
        }
    },

    async getChatbotResponse(message, history) {
        const historyText = history.map(h => `${h.role}: ${h.text}`).join("\n");
        const prompt = `You are a helpful university complaint assistant.
        History:
        ${historyText}
        User: "${message}"
        Provide a concise, helpful solution.`;

        return generateText(prompt);
    },

    async getAdminReplySuggestion(complaintDescription) {
        const prompt = `A student's complaint about "${complaintDescription}" has been resolved.
        Write 3 polite, professional closing reply messages in JSON array format.`;

        try {
            const response = await generateText(prompt);
            const jsonString = response.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("AI Suggestion Error:", error);
            return [
                "The issue has been resolved.",
                "Your complaint has been addressed. Thank you.",
                "We have resolved your concern. Let us know if you need anything further."
            ];
        }
    },

    async getFAQResponse(question, faqs) {
        const matching = faqs.find(f => f.question.toLowerCase().includes(question.toLowerCase()));
        if (matching) return matching.answer;

        const prompt = `You answer university FAQs clearly and concisely.
        Question: "${question}"
        If unknown, say you don't have that info.`;

        return generateText(prompt);
    }
};
