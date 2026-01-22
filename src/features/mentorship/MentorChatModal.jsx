import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import { X, Send } from 'lucide-react';

const MentorChatModal = ({ user, chatWith, onClose, role }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef(null);

    const chatId = useMemo(() => {
        const ids = [user.uid, chatWith.uid].sort();
        return ids.join('_');
    }, [user.uid, chatWith.uid]);

    useEffect(() => {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => doc.data()));
            setLoading(false);
        });
        return unsubscribe;
    }, [chatId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, {
            text: newMessage,
            senderId: user.uid,
            senderName: user.displayName || user.email,
            timestamp: serverTimestamp()
        });
        setNewMessage('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900 w-full max-w-2xl h-[80vh] rounded-2xl border border-slate-700 flex flex-col"
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">Chat with {chatWith.name}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                    {loading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 max-w-[80%] ${msg.senderId === user.uid ? 'self-end flex-row-reverse' : 'self-start'}`}>
                             <div className={`p-3 rounded-lg ${msg.senderId === user.uid ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                                <p className="text-sm whitespace-pre-wrap text-white">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                        <input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSendMessage}
                            placeholder="Type your message..."
                            className="flex-grow p-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button onClick={handleSendMessage} className="p-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"><Send size={20}/></button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MentorChatModal;