import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import StudentAdminChatModal from './StudentAdminChatModal';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const StudentChatWidget = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // --- FIRESTORE LISTENER (PRESERVED) ---
    useEffect(() => {
        if (!user) return;
        const chatRef = doc(db, 'studentAdminChats', user.uid);
        
        const unsubscribe = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Show count only if unread by student
                if (data.isReadByStudent === false) {
                    setUnreadCount(data.unreadCount || 1);
                } else {
                    setUnreadCount(0);
                }
            } else {
                setUnreadCount(0);
            }
        });
        return () => unsubscribe();
    }, [user]);

    if (!user) return null;

    return (
        <>
            <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 group">
                {/* Tooltip (Desktop Only) */}
                <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap hidden md:block">
                    {isOpen ? 'Close Chat' : 'Support Chat'}
                </div>

                {/* Main Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        relative flex items-center justify-center 
                        w-12 h-12 md:w-14 md:h-14 
                        rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-white/10
                        transition-all duration-300 hover:scale-105 active:scale-95
                        ${isOpen 
                            ? 'bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20' 
                            : 'bg-[#0F172A] text-cyan-400 hover:bg-[#1E293B] hover:border-cyan-500/30 group-hover:shadow-cyan-500/20'
                        }
                    `}
                    aria-label={isOpen ? "Close chat" : "Open chat"}
                >
                    {/* Inner Gradient for Depth */}
                    {!isOpen && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}

                    {/* Icon Transition */}
                    <div className="relative z-10 transition-transform duration-300">
                        {isOpen ? (
                            <X size={24} strokeWidth={2} />
                        ) : (
                            <MessageSquare size={24} strokeWidth={2} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                        )}
                    </div>

                    {/* Unread Badge */}
                    {unreadCount > 0 && !isOpen && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 border-2 border-[#0F172A] rounded-full shadow-sm animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Chat Modal */}
            {isOpen && <StudentAdminChatModal user={user} onClose={() => setIsOpen(false)} />}
        </>
    );
};

export default StudentChatWidget;