import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp, 
    doc, 
    setDoc, 
    getDoc 
} from 'firebase/firestore'; // Added missing imports
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import { X, Send } from 'lucide-react';

const LostAndFoundChatModal = ({ user, chatInfo, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatReady, setChatReady] = useState(false); // New state to prevent race conditions
    const chatEndRef = useRef(null);
    const { item, chatWith } = chatInfo;

    // --- 1. Robust Chat ID Generation ---
    const chatId = useMemo(() => {
        if (!item?.id || !user?.uid || !chatWith?.uid) return null;
        
        // Sort IDs to ensure consistency regardless of who starts the chat
        const participantIds = [user.uid, chatWith.uid].sort();
        return `lostfound_${item.id}_${participantIds[0]}_${participantIds[1]}`;
    }, [item, user, chatWith]);

    // --- 2. Initialize Chat Document (CRITICAL FOR PERMISSIONS) ---
    useEffect(() => {
        const initChat = async () => {
            if (!chatId) return;

            try {
                const chatRef = doc(db, 'lostAndFoundChats', chatId);
                const chatSnap = await getDoc(chatRef);

                if (!chatSnap.exists()) {
                    // Create the chat document with the 'participants' array.
                    // This is required by your new Security Rules.
                    await setDoc(chatRef, {
                        itemId: item.id,
                        itemName: item.itemName || "Lost Item", // Fallback if name missing
                        participants: [user.uid, chatWith.uid],
                        startedBy: user.uid,
                        createdAt: serverTimestamp(),
                        lastMessage: "Chat started",
                        lastMessageTimestamp: serverTimestamp()
                    });
                }
                setChatReady(true); // Signal that it is safe to subscribe
            } catch (error) {
                console.error("Error initializing chat:", error);
                setLoading(false);
            }
        };

        initChat();
    }, [chatId, item, user, chatWith]);

    // --- 3. Subscribe to Messages ---
    useEffect(() => {
        // Wait for chatId AND chatReady (initialization complete)
        if (!chatId || !chatReady) {
            if (!chatId) setLoading(false);
            return;
        }

        const messagesRef = collection(db, 'lostAndFoundChats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, [chatId, chatReady]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !chatId) return;

        try {
            const text = newMessage.trim();
            setNewMessage(''); // Optimistic update

            // 1. Update Parent Doc FIRST (Timestamp & Last Message)
            // ensuring the participants field is present for security rules
            const chatDocRef = doc(db, 'lostAndFoundChats', chatId);
            await setDoc(chatDocRef, {
                lastMessage: text,
                lastMessageTimestamp: serverTimestamp(),
                participants: [user.uid, chatWith.uid], 
                itemId: item.id,
                itemName: item.itemName || "Lost Item"
            }, { merge: true });

            // 2. Add Message to Subcollection
            const messagesRef = collection(db, 'lostAndFoundChats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: text,
                senderId: user.uid,
                senderName: user.displayName || user.email,
                timestamp: serverTimestamp()
            });

        } catch (error) {
            console.error("Failed to send message:", error);
            alert("Message failed to send. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 w-full max-w-2xl h-[80vh] rounded-2xl border border-slate-700 flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <header className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Chat with {chatWith.name}
                        </h3>
                        <p className="text-sm text-cyan-400 font-medium">Item: {item.itemName}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-slate-700/50 rounded-full text-slate-400 hover:text-white hover:bg-red-500/20 transition-all"
                    >
                        <X size={24} />
                    </button>
                </header>

                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-slate-900/50">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Spinner size="h-8 w-8" color="border-cyan-500" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-slate-500 mt-10">
                            <p>No messages yet.</p>
                            <p className="text-sm">Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`flex flex-col max-w-[80%] ${msg.senderId === user.uid ? 'self-end items-end' : 'self-start items-start'}`}
                            >
                                <div className={`p-3 rounded-2xl px-4 text-sm ${
                                    msg.senderId === user.uid 
                                        ? 'bg-cyan-600 text-white rounded-br-none' 
                                        : 'bg-slate-700 text-slate-200 rounded-bl-none'
                                }`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                {msg.timestamp && (
                                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                                        {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-700">
                    <div className="flex items-center gap-3">
                        <input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type your message..."
                            className="flex-grow p-3.5 border border-slate-700 rounded-xl bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                        />
                        <button 
                            onClick={handleSendMessage} 
                            disabled={!newMessage.trim()}
                            className="p-3.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-cyan-900/20"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LostAndFoundChatModal;