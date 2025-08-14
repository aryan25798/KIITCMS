import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AI_HELPERS } from '../../services/ai';
import Spinner from '../../components/ui/Spinner';
import { Search } from 'lucide-react';

const FAQ = () => {
    const [faqs, setFaqs] = useState([]);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'knowledgeBase'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFaqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;
        setLoading(true);
        setAnswer('');
        try {
            const aiResponse = await AI_HELPERS.getFAQResponse(question, faqs);
            setAnswer(aiResponse);
        } catch (error) {
            console.error("FAQ Error:", error);
            setAnswer("Sorry, I couldn't fetch an answer right now. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-slate-700/50">
            <h2 className="text-2xl font-bold mb-4 text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 mb-6">Have a question? Ask our AI assistant. It might have the answer you're looking for.</p>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-6">
                <input
                    id="faq-question"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., How do I reset my library password?"
                    className="flex-grow p-3 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 disabled:opacity-60">
                    {loading ? <Spinner /> : <Search size={18} />}
                    <span>{loading ? 'Searching...' : 'Ask'}</span>
                </button>
            </form>
            {answer && (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <p className="text-slate-200 whitespace-pre-wrap">{answer}</p>
                </div>
            )}
        </div>
    );
};

export default FAQ;