import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import { Send } from 'lucide-react';

const ChatInterface = ({ complaint, user, newMessage, setNewMessage, handleSendMessage }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef(null);

    useEffect(() => {
        const q = query(collection(db, 'complaints', complaint.id, 'replies'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, [complaint.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="mt-4">
            <h4 className="font-semibold text-slate-300 mb-2">Live Chat</h4>
            <div className="h-64 bg-slate-900/50 p-3 rounded-lg overflow-y-auto flex flex-col gap-3">
                {loading ? <Spinner /> : messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.authorId === user.uid ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-lg max-w-xs ${msg.authorId === user.uid ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {msg.author} - {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : '...'}
                        </p>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <div className="flex items-center gap-2 mt-2">
                <input
                    id={`chat-input-${complaint.id}`}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-grow p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button onClick={handleSendMessage} className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"><Send size={20}/></button>
            </div>
        </div>
    );
};

export default ChatInterface;