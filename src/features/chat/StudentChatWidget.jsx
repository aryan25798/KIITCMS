import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import StudentAdminChatModal from './StudentAdminChatModal';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const StudentChatWidget = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Listen to the main chat document to get the unread count
        const chatRef = doc(db, 'studentAdminChats', user.uid);
        const unsubscribe = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().isReadByStudent === false) {
                // If the flag is false, assume there is at least one unread message
                // For a more precise count, you would need a counter in the main doc.
                setUnreadCount(docSnap.data().unreadCount || 1);
            } else {
                setUnreadCount(0);
            }
        });

        return unsubscribe;
    }, [user]);

    if (!user) return null;

    const handleChatToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button
                onClick={handleChatToggle}
                className="fixed bottom-8 right-8 bg-cyan-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-700 transition-transform hover:scale-110 z-50"
                aria-label="Toggle chat"
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && <StudentAdminChatModal user={user} onClose={() => setIsOpen(false)} />}
        </>
    );
};

export default StudentChatWidget;
