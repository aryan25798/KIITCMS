import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ user, role, onNavigate }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Safety check: Don't query if user data isn't ready
        if (!user || !role) return;

        const coll = collection(db, 'notifications');
        let q;

        try {
            if (role === 'admin') {
                // Admin sees notifications sent to 'admin' role
                q = query(
                    coll, 
                    where('recipientRole', '==', 'admin'), 
                    orderBy('createdAt', 'desc'), 
                    limit(15)
                );
            } 
            else if (role === 'department') {
                // 1. Extract prefix safely
                const deptPrefix = user.email.split('@')[0].toLowerCase();
                
                // 2. Map to Database Strings
                const deptMap = {
                    'it': 'IT Department',
                    'maintenance': 'Maintenance',
                    'hostel': 'Hostel Affairs',
                    'academics': 'Academics',
                    'library': 'Library'
                };
                const myDept = deptMap[deptPrefix];
                
                // 3. Strict Query Construction
                if (myDept) {
                    q = query(
                        coll, 
                        where('recipientDept', '==', myDept), 
                        orderBy('createdAt', 'desc'), 
                        limit(15)
                    );
                } else {
                    // Stop execution if department is invalid to prevent 403 errors
                    // console.warn("NotificationBell: Unknown Department Prefix", deptPrefix);
                    return; 
                }
            } 
            else {
                // Students/Mentors see notifications for their specific UID
                q = query(
                    coll, 
                    where('recipientId', '==', user.uid), 
                    orderBy('createdAt', 'desc'), 
                    limit(15)
                );
            }

            // 4. Attach Listener
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNotifications(fetchedNotifs);
            }, (error) => {
                // Ignore permission errors during login/logout transitions
                if (error.code !== 'permission-denied') {
                    console.error("Error fetching notifications:", error);
                }
            });

            return () => unsubscribe();

        } catch (err) {
            console.error("Notification Logic Error:", err);
        }

    }, [user, role]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-white text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => {
                                        setIsOpen(false);
                                        if (notif.targetUrl) onNavigate(notif.targetUrl);
                                    }}
                                    className={`p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-slate-800/20' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notif.isRead ? 'bg-cyan-500' : 'bg-slate-600'}`} />
                                        <div>
                                            <p className={`text-sm ${!notif.isRead ? 'text-white font-medium' : 'text-slate-400'}`}>
                                                {notif.message}
                                            </p>
                                            <span className="text-xs text-slate-500 mt-1 block">
                                                {notif.createdAt?.seconds 
                                                    ? formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true }) 
                                                    : 'Just now'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                No notifications yet.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;