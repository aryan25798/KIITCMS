import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home, FileUp, ShoppingBag, PackageSearch, GraduationCap, Plane, ShieldQuestion, LogOut,
    BarChart2, Users, UserCheck, Book, Shield, Briefcase, X, User, HeartPulse, Calendar, 
    UploadCloud, AlertTriangle, MessageSquare, Newspaper // Import Newspaper icon
} from 'lucide-react';

const Sidebar = ({ user, role, onLogout, isOpen, setIsOpen }) => {
    const getRoleInfo = () => {
        switch (role) {
            case 'admin': return { name: 'Super Admin', icon: <Shield />, color: 'text-purple-400' };
            case 'department': return { name: `${user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)} Dept.`, icon: <Briefcase />, color: 'text-slate-400' };
            case 'mentor': return { name: 'Mentor', icon: <GraduationCap />, color: 'text-green-400' };
            default: return { name: 'Student', icon: <User />, color: 'text-cyan-400' };
        }
    };
    const roleInfo = getRoleInfo();

    const navItems = useMemo(() => {
        const allItems = [
            { path: '/portal/dashboard', label: 'Complains Dashboard', icon: <Home />, roles: ['student', 'admin', 'department'] },
            { path: '/portal/mentor-dashboard', label: 'Mentor Dashboard', icon: <Home />, roles: ['mentor'] },
            { path: '/portal/new-complaint', label: 'New Complaint', icon: <FileUp />, roles: ['student'] },
            { path: '/portal/marketplace', label: 'Marketplace', icon: <ShoppingBag />, roles: ['student', 'admin'] },
            { path: '/portal/lost-and-found', label: 'Lost & Found', icon: <PackageSearch />, roles: ['student', 'admin'] },
            { path: '/portal/mentors', label: 'Find a Mentor', icon: <GraduationCap />, roles: ['student'] },
            { path: '/portal/leave', label: 'Hostel Leave', icon: <Plane />, roles: ['student'] },
            { path: '/portal/faq', label: 'FAQ', icon: <ShieldQuestion />, roles: ['student'] },
            { path: '/portal/health-report', label: 'Health Report', icon: <HeartPulse />, roles: ['student'] },
            { path: '/portal/timetable', label: 'My Timetable', icon: <Calendar />, roles: ['student'] },
            { path: '/portal/news', label: 'Latest News', icon: <Newspaper />, roles: ['student'] }, // Added News link
            { path: '/portal/analytics', label: 'Analytics', icon: <BarChart2 />, roles: ['admin'] },
            { path: '/portal/users', label: 'User Management', icon: <Users />, roles: ['admin'] },
            { path: '/portal/mentor-approval', label: 'Mentor Approvals', icon: <UserCheck />, roles: ['admin'] },
            { path: '/portal/knowledge-base', label: 'Knowledge Base', icon: <Book />, roles: ['admin'] },
            { path: '/portal/student-chats', label: 'Student Chats', icon: <MessageSquare />, roles: ['admin'] },
            { path: '/portal/emergency-log', label: 'Emergency Log', icon: <AlertTriangle />, roles: ['admin', 'department'] },
            { path: '/portal/upload-timetable', label: 'Upload Timetable', icon: <UploadCloud />, roles: ['admin'] },
            { path: '/portal/leave-management', label: 'Leave Management', icon: <Plane />, roles: ['admin', 'department'] },
        ];

        let userNav = allItems.filter(item => item.roles.includes(role));

        if (role === 'department' && !user.email.startsWith('hostel')) {
            userNav = userNav.filter(item => item.path !== '/portal/leave-management');
        }

        if (role === 'mentor') {
            userNav = allItems.filter(item => item.path === '/portal/mentor-dashboard');
        }

        return userNav;
    }, [role, user.email]);

    return (
        <>
            <div
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 flex flex-col p-4 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex items-center justify-between mb-10 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg bg-slate-800 ${roleInfo.color}`}>
                            {roleInfo.icon}
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-lg truncate">{roleInfo.name}</h1>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav
                    className="flex-1 space-y-2 overflow-y-auto scrollbar-hide"
                    style={{
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                    }}
                >
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                            }
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto flex-shrink-0 pt-4">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <style>
                {`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}
            </style>
        </>
    );
};

export default Sidebar;
