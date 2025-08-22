import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Bell, AlertTriangle } from 'lucide-react'; // Import AlertTriangle
import { useNavigate } from 'react-router-dom';

const NotificationBell = ({ user, role }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const getDepartmentName = (email) => {
        const prefix = email.split('@')[0];
        const deptMap = { it: 'IT Department', maintenance: 'Maintenance', hostel: 'Hostel Affairs', academics: 'Academics' };
        return deptMap[prefix] || 'Unassigned';
    };

    useEffect(() => {
        if (!user) return;
        
        const baseQuery = collection(db, 'notifications');
        let q;

        if (role === 'student' || role === 'mentor') {
            q = query(baseQuery, where('recipientId', '==', user.uid));
        } else if (role === 'admin') {
            // Admin receives their role-based notifications
            q = query(baseQuery, where('recipientRole', '==', 'admin'));
        } else if (role === 'department') {
            const deptName = getDepartmentName(user.email);
            q = query(baseQuery, where('recipientDept', '==', deptName));
        } else {
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort to show SOS alerts first, then by time
            fetchedNotifications.sort((a, b) => {
                if (a.type === 'emergency_sos' && b.type !== 'emergency_sos') return -1;
                if (a.type !== 'emergency_sos' && b.type === 'emergency_sos') return 1;
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });
            setNotifications(fetchedNotifications);
        }, (error) => {
            console.error("Error fetching notifications:", error);
        });

        return unsubscribe;
    }, [user, role]);

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
        }
        
        // --- THE FIX: Handle navigation for the new SOS alert type ---
        if (notification.type === 'emergency_sos') {
            navigate('/portal/emergency-log');
        } else if (notification.type.includes('complaint') || notification.type.includes('escalation')) {
            // Assuming you have a route like '/portal/dashboard' for complaints
            navigate('/portal/dashboard');
        } else if (notification.type.includes('leave')) {
            navigate(role === 'student' ? '/portal/leave' : '/portal/leave-management');
        } else if (notification.type.includes('mentor_approval')) {
            navigate('/portal/mentor-approval');
        } else if (notification.type.includes('mentor')) {
            navigate(role === 'student' ? '/portal/mentors' : '/portal/mentor-dashboard');
        } else if (notification.type.includes('lost_item')) {
            navigate('/portal/lost-and-found');
        }
        setIsOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative text-slate-400 hover:text-white">
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-slate-950">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                    <div className="p-3 font-bold border-b border-slate-700 text-white">Notifications</div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                // --- THE FIX: Add special styling for SOS alerts ---
                                className={`p-3 border-b border-slate-700/50 cursor-pointer ${
                                    n.type === 'emergency_sos' 
                                    ? 'bg-red-500/20 hover:bg-red-500/30' 
                                    : !n.isRead ? 'bg-cyan-500/10 hover:bg-slate-700/50' : 'hover:bg-slate-700/50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {n.type === 'emergency_sos' && <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />}
                                    <div>
                                        <p className="text-sm text-slate-200">{n.message}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString() : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="p-4 text-sm text-slate-400">No notifications yet.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
