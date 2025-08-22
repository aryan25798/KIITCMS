import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import { Edit, Trash2 } from 'lucide-react';

const KnowledgeBaseManagement = () => {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [editingFaq, setEditingFaq] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'knowledgeBase'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFaqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleAddFaq = async (e) => {
        e.preventDefault();
        if (!newQuestion.trim() || !newAnswer.trim()) return;
        await addDoc(collection(db, 'knowledgeBase'), {
            question: newQuestion,
            answer: newAnswer,
            createdAt: serverTimestamp()
        });
        setNewQuestion('');
        setNewAnswer('');
    };

    const handleUpdateFaq = async () => {
        if (!editingFaq) return;
        const faqRef = doc(db, 'knowledgeBase', editingFaq.id);
        await updateDoc(faqRef, {
            question: editingFaq.question,
            answer: editingFaq.answer
        });
        setEditingFaq(null);
    };

    const handleDeleteFaq = async (id) => {
        if (window.confirm("Are you sure you want to delete this FAQ?")) {
            await deleteDoc(doc(db, 'knowledgeBase', id));
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <h3 className="text-xl font-bold mb-4 text-white">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h3>
                <form onSubmit={!editingFaq ? handleAddFaq : (e) => e.preventDefault()} className="space-y-4">
                    <input type="text" value={editingFaq ? editingFaq.question : newQuestion} onChange={e => editingFaq ? setEditingFaq({...editingFaq, question: e.target.value}) : setNewQuestion(e.target.value)} placeholder="Question" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    <textarea value={editingFaq ? editingFaq.answer : newAnswer} onChange={e => editingFaq ? setEditingFaq({...editingFaq, answer: e.target.value}) : setNewAnswer(e.target.value)} placeholder="Answer" className="w-full p-3 h-32 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    {editingFaq ? (
                        <div className="flex gap-4">
                            <button type="button" onClick={handleUpdateFaq} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Save Changes</button>
                            <button type="button" onClick={() => setEditingFaq(null)} className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700">Cancel</button>
                        </div>
                    ) : (
                        <button type="submit" className="px-6 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600">Add FAQ</button>
                    )}
                </form>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                 <h3 className="text-xl font-bold mb-4 text-white">Manage Existing FAQs</h3>
                 <div className="space-y-4">
                    {loading ? <Spinner /> : faqs.map(faq => (
                        <div key={faq.id} className="p-4 bg-slate-900/50 rounded-lg">
                            <h4 className="font-bold text-slate-200">{faq.question}</h4>
                            <p className="text-sm text-slate-400 mt-1">{faq.answer}</p>
                            <div className="flex gap-4 mt-4">
                                <button onClick={() => setEditingFaq(faq)} className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300"><Edit size={16}/> Edit</button>
                                <button onClick={() => handleDeleteFaq(faq.id)} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"><Trash2 size={16}/> Delete</button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default KnowledgeBaseManagement;