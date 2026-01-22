import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home, FileUp, ShoppingBag, PackageSearch, GraduationCap, Plane, ShieldQuestion, LogOut,
    BarChart2, Users, UserCheck, Book, Shield, Briefcase, X, User, HeartPulse, Calendar, 
    UploadCloud, AlertTriangle, MessageSquare, Newspaper 
} from 'lucide-react';

const Sidebar = ({ user, role, onLogout, isOpen, setIsOpen }) => {
    
    // --- LOGIC: Preserve existing role and nav definitions ---
    const getRoleInfo = () => {
        switch (role) {
            case 'admin': return { name: 'Super Admin', icon: <Shield size={20} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
            case 'department': return { name: `${user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)} Dept.`, icon: <Briefcase size={20} />, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
            case 'mentor': return { name: 'Mentor', icon: <GraduationCap size={20} />, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
            default: return { name: 'Student', icon: <User size={20} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
        }
    };
    const roleInfo = getRoleInfo();

    const navItems = useMemo(() => {
        const allItems = [
            { path: '/portal/dashboard', label: 'Complains Dashboard', icon: <Home size={20} />, roles: ['student', 'admin', 'department'] },
            { path: '/portal/mentor-dashboard', label: 'Mentor Dashboard', icon: <Home size={20} />, roles: ['mentor'] },
            { path: '/portal/new-complaint', label: 'New Complaint', icon: <FileUp size={20} />, roles: ['student'] },
            { path: '/portal/marketplace', label: 'Marketplace', icon: <ShoppingBag size={20} />, roles: ['student', 'admin'] },
            { path: '/portal/lost-and-found', label: 'Lost & Found', icon: <PackageSearch size={20} />, roles: ['student', 'admin'] },
            { path: '/portal/mentors', label: 'Find a Mentor', icon: <GraduationCap size={20} />, roles: ['student'] },
            { path: '/portal/leave', label: 'Hostel Leave', icon: <Plane size={20} />, roles: ['student'] },
            { path: '/portal/faq', label: 'FAQ', icon: <ShieldQuestion size={20} />, roles: ['student'] },
            { path: '/portal/health-report', label: 'Health Report', icon: <HeartPulse size={20} />, roles: ['student'] },
            { path: '/portal/timetable', label: 'My Timetable', icon: <Calendar size={20} />, roles: ['student'] },
            { path: '/portal/news', label: 'Latest News', icon: <Newspaper size={20} />, roles: ['student'] },
            { path: '/portal/analytics', label: 'Analytics', icon: <BarChart2 size={20} />, roles: ['admin'] },
            { path: '/portal/users', label: 'User Management', icon: <Users size={20} />, roles: ['admin'] },
            { path: '/portal/mentor-approval', label: 'Mentor Approvals', icon: <UserCheck size={20} />, roles: ['admin'] },
            { path: '/portal/knowledge-base', label: 'Knowledge Base', icon: <Book size={20} />, roles: ['admin'] },
            { path: '/portal/student-chats', label: 'Student Chats', icon: <MessageSquare size={20} />, roles: ['admin'] },
            { path: '/portal/emergency-log', label: 'Emergency Log', icon: <AlertTriangle size={20} />, roles: ['admin', 'department'] },
            { path: '/portal/upload-timetable', label: 'Upload Timetable', icon: <UploadCloud size={20} />, roles: ['admin'] },
            { path: '/portal/leave-management', label: 'Leave Management', icon: <Plane size={20} />, roles: ['admin', 'department'] },
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
            {/* --- MOBILE OVERLAY (Backdrop) --- */}
            <div 
                className={`
                    fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => setIsOpen(false)}
            />

            {/* --- SIDEBAR CONTAINER --- */}
            <aside
                className={`
                    fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0F172A] border-r border-white/5 flex flex-col 
                    transition-transform duration-300 ease-out md:relative md:translate-x-0 shadow-2xl md:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* --- HEADER: User Profile --- */}
                <div className="h-24 flex items-center justify-between px-6 border-b border-white/5">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                        <div className={`p-2.5 rounded-xl ${roleInfo.bg} ${roleInfo.color} border ${roleInfo.border} flex-shrink-0`}>
                            {roleInfo.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="font-semibold text-white text-sm truncate leading-tight">
                                {roleInfo.name}
                            </h1>
                            <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    
                    {/* Close Button (Mobile Only) */}
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="md:hidden p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* --- NAVIGATION LIST --- */}
                <nav
                    className="flex-1 overflow-y-auto py-6 px-3 space-y-1"
                    style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                >
                    <style>{`.overflow-y-auto::-webkit-scrollbar { display: none; }`}</style>

                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                ${isActive 
                                    ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-400' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Indicator Border */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                    )}
                                    
                                    <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="tracking-wide">
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* --- FOOTER: Logout --- */}
                <div className="p-4 border-t border-white/5 bg-[#0F172A]">
                    <button
                        onClick={onLogout}
                        className="group w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold 
                                   text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 
                                   transition-all duration-200"
                    >
                        <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;