import { geminiConfig } from '../config';

// WARNING: Your Gemini API key is exposed here. This is not secure.
const GEMINI_API_KEY = geminiConfig.apiKey;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

async function generateText(prompt) {
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
        throw new Error("Invalid response structure from AI API");
    }
    return data.candidates[0].content.parts[0].text;
}

export const AI_HELPERS = {
    async getCategoryAndPriority(description) {
        const prompt = `Analyze the following user complaint and return a JSON object with "category", "priority", and "assignedDept".
        Categories can be: "Hostel", "Mess", "Network", "Academic", "Infrastructure", "Other".
        Priority can be: "Low", "Medium", "High".
        Based on the category, assign it to a department from this list: "IT Department", "Maintenance", "Hostel Affairs", "Academics", "Unassigned".
        For example, a 'Network' complaint should be assigned to 'IT Department'.
        Complaint: "${description}"`;
        try {
            const response = await generateText(prompt);
            const jsonString = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResponse = JSON.parse(jsonString);
            const priority = jsonResponse.priority || 'Low';
            const priorityLevel = { 'High': 1, 'Medium': 2, 'Low': 3 }[priority];
            return {
                category: jsonResponse.category || 'Other',
                priority,
                priorityLevel,
                assignedDept: jsonResponse.assignedDept || 'Unassigned'
            };
        } catch (error) {
            console.error("AI Categorization Error:", error);
            const descLower = description.toLowerCase();
            let priority = "Low";
            if (["urgent", "fire", "leak", "security", "emergency"].some(kw => descLower.includes(kw))) priority = "High";
            else if (["slow", "broken", "not working", "unavailable"].some(kw => descLower.includes(kw))) priority = "Medium";
            const priorityLevel = { 'High': 1, 'Medium': 2, 'Low': 3 }[priority];
            return { category: 'Other', priority, priorityLevel, assignedDept: 'Unassigned' };
        }
    },

    async getChatbotResponse(message, history) {
        const historyText = history.map(h => `${h.role}: ${h.text}`).join('\n');
        const prompt = `You are a helpful university complaint assistant chatbot. Your goal is to solve the user's problem if possible.
        Current conversation history:
        ${historyText}
        User: "${message}"
        Provide a concise, helpful, and step-by-step response to try and solve the issue. If you cannot solve it, ask the user to submit a formal complaint.`;
        return generateText(prompt);
    },

    async getAdminReplySuggestion(complaintDescription) {
        const prompt = `A student's complaint about "${complaintDescription}" has been resolved. Write 3 polite, professional, and distinct closing reply suggestions for an admin, in a JSON array format like ["suggestion1", "suggestion2", "suggestion3"].`;
        try {
            const response = await generateText(prompt);
            const jsonString = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResponse = JSON.parse(jsonString);
            return jsonResponse;
        } catch (error) {
            console.error("AI Suggestion Error:", error);
            return ["The issue has been resolved.", "Your complaint has been addressed and the ticket is now closed. Thank you.", "We have resolved the issue you reported. Please let us know if you have any other concerns."];
        }
    },

    async getFAQResponse(question, faqs) {
        const matchingFaq = faqs.find(faq => faq.question.toLowerCase().includes(question.toLowerCase()));
        if (matchingFaq) {
            return matchingFaq.answer;
        }

        const prompt = `You are an AI assistant for a university's knowledge base. Answer the following student question clearly and concisely. If you don't know the answer, say that you don't have information on that topic and suggest they contact administration.
        Question: "${question}"`;
        return generateText(prompt);
    },
};