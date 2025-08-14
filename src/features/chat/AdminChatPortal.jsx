import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Send, MessageSquare, Search, Plus } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

// Reusable Chat Window for the admin
const AdminChatWindow = ({ activeChat, adminUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!activeChat) return;

        const messagesQuery = query(
            collection(db, `studentAdminChats/${activeChat.studentId}/messages`),
            orderBy('timestamp')
        );
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [activeChat]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !activeChat) return;
        
        const messageData = {
            text: newMessage,
            senderId: adminUser.uid,
            senderName: 'Admin',
            timestamp: serverTimestamp(),
        };

        await addDoc(collection(db, `studentAdminChats/${activeChat.studentId}/messages`), messageData);
        
        await updateDoc(doc(db, 'studentAdminChats', activeChat.studentId), {
            lastMessage: `Admin: ${newMessage}`,
            lastMessageTimestamp: serverTimestamp(),
            isReadByStudent: false, // Mark as unread for the student
        });

        setNewMessage('');
    };

    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center bg-slate-900 text-slate-400">
                <MessageSquare size={48} />
                <p className="mt-4">Select a conversation to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-900">
            <header className="p-4 border-b border-slate-700">
                <h3 className="font-bold text-white">Chat with {activeChat.studentName}</h3>
                <p className="text-sm text-slate-400">{activeChat.studentEmail}</p>
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.senderId === adminUser.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl ${msg.senderId === adminUser.uid ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>
            <footer className="p-4 border-t border-slate-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button type="submit" className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50" disabled={!newMessage.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </footer>
        </div>
    );
};


// Main Portal Component
const AdminChatPortal = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allStudents, setAllStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showStudentList, setShowStudentList] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'studentAdminChats'), orderBy('lastMessageTimestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchStudents = async () => {
            const usersCollection = collection(db, 'users');
            const studentsQuery = query(usersCollection, where('role', '==', 'student'));
            const snapshot = await getDocs(studentsQuery);
            setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchStudents();
    }, []);

    const handleSelectChat = (convo) => {
        setActiveChat(convo);
        setShowStudentList(false);
        if (!convo.isReadByAdmin) {
            updateDoc(doc(db, 'studentAdminChats', convo.id), { isReadByAdmin: true });
        }
    };
    
    const handleStartNewChat = async (student) => {
        const existingChat = conversations.find(convo => convo.studentId === student.id);

        if (existingChat) {
            handleSelectChat(existingChat);
        } else {
            const newChatRef = doc(db, 'studentAdminChats', student.id);
            await setDoc(newChatRef, {
                studentId: student.id,
                studentName: student.displayName || student.email,
                studentEmail: student.email,
                lastMessage: '',
                lastMessageTimestamp: serverTimestamp(),
                isReadByAdmin: true,
                isReadByStudent: false,
            });
            const newConvo = {
                id: student.id,
                studentId: student.id,
                studentName: student.displayName || student.email,
                studentEmail: student.email,
                lastMessage: '',
                lastMessageTimestamp: { seconds: new Date().getTime() / 1000 },
                isReadByAdmin: true,
                isReadByStudent: false,
            };
            setActiveChat(newConvo);
            setShowStudentList(false);
        }
    };

    const filteredStudents = allStudents.filter(student =>
        student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-10rem)] bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <aside className="w-1/3 border-r border-slate-700 flex flex-col">
                <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Student Chats</h2>
                    <button onClick={() => setShowStudentList(!showStudentList)} className="p-2 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition-colors">
                        <Plus size={20} />
                    </button>
                </header>
                {showStudentList && (
                    <div className="p-4 border-b border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="mt-4 max-h-48 overflow-y-auto bg-slate-700 rounded-lg">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <div 
                                        key={student.id} 
                                        onClick={() => handleStartNewChat(student)}
                                        className="p-3 border-b border-slate-600 cursor-pointer hover:bg-slate-600 transition-colors"
                                    >
                                        <p className="font-semibold text-white">{student.displayName || student.email.split('@')[0]}</p>
                                        <p className="text-xs text-slate-400">{student.email}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="p-3 text-center text-slate-400">No students found.</p>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto">
                    {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
                        conversations.map(convo => (
                            <div 
                                key={convo.id} 
                                onClick={() => handleSelectChat(convo)}
                                className={`p-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 ${activeChat?.id === convo.id ? 'bg-slate-700' : ''}`}
                            >
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-white truncate">{convo.studentName}</p>
                                    {!convo.isReadByAdmin && <span className="w-3 h-3 bg-cyan-400 rounded-full"></span>}
                                </div>
                                <p className="text-xs text-slate-400 truncate">{convo.studentEmail}</p>
                                <p className="text-sm text-slate-300 truncate mt-1">{convo.lastMessage}</p>
                            </div>
                        ))
                    }
                </div>
            </aside>
            <AdminChatWindow activeChat={activeChat} adminUser={user} />
        </div>
    );
};

export default AdminChatPortal;
