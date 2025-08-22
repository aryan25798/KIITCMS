import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Send, X, MessageSquare } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const StudentAdminChatModal = ({ user, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const messagesQuery = query(
            collection(db, `studentAdminChats/${user.uid}/messages`),
            orderBy('timestamp')
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
            scrollToBottom();
        });

        return unsubscribe;
    }, [user.uid]);

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const messageData = {
            text: newMessage,
            senderId: user.uid,
            senderName: user.displayName || user.email.split('@')[0],
            timestamp: serverTimestamp(),
        };

        // THE FIX: Add studentEmail to the document
        await setDoc(doc(db, 'studentAdminChats', user.uid), {
            studentId: user.uid,
            studentName: user.displayName || user.email.split('@')[0],
            studentEmail: user.email, // Add this line
            lastMessage: newMessage,
            lastMessageTimestamp: serverTimestamp(),
            isReadByAdmin: false
        }, { merge: true });

        await addDoc(collection(db, `studentAdminChats/${user.uid}/messages`), messageData);
        setNewMessage('');
    };

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-[calc(100%-2rem)] max-w-sm h-[60vh] max-h-[500px] bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50">
            <header className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <MessageSquare className="text-cyan-400" />
                    <h3 className="font-bold text-white">Chat with Admin</h3>
                </div>
                <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </header>

            <main className="flex-1 p-4 overflow-y-auto">
                {loading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : 
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.senderId === user.uid ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">
                                        {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}
                                    </p>
                                </div>
                            </div>
                        ))}
                         <div ref={messagesEndRef} />
                    </div>
                }
            </main>

            <footer className="p-4 border-t border-slate-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button type="submit" className="p-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-colors disabled:opacity-50" disabled={!newMessage.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default StudentAdminChatModal;
