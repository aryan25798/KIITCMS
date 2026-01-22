import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
// CHANGED: Imported 'auth' to perform client-side session checks
import { auth, db, functions } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { 
    Search, 
    Trash2, 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    ShieldCheck, 
    User,
    GraduationCap,
    Award,
    Building2,
    MoreVertical
} from 'lucide-react';

const UserManagement = () => {
    // --- STATE ---
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null); 
    
    // Modal State
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        data: null, 
        type: null 
    });

    // --- 1. REAL-TIME FETCH ---
    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            setUsers(fetchedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- 2. ACTIONS ---
    
    // Approve or Reject a user
    const handleStatusChange = async (uid, newStatus) => {
        // SAFETY CHECK: Ensure user is actually logged in before calling server
        if (!auth.currentUser) {
            alert("Security Alert: Your login session has expired. Please refresh the page and log in again.");
            return;
        }

        setProcessingId(uid);
        try {
            console.log(`Attempting to set status '${newStatus}' for user ${uid} as admin ${auth.currentUser.uid}`);
            const updateUserStatus = httpsCallable(functions, 'updateUserStatus');
            await updateUserStatus({ 
                targetUid: uid, 
                status: newStatus, 
                collectionName: 'users' 
            });
            // Success is handled by the real-time snapshot
        } catch (error) {
            console.error("Status update failed:", error);
            alert(`Failed to ${newStatus} user: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Permanently Delete a user
    const handleDeleteUser = async () => {
        // SAFETY CHECK: Ensure user is logged in
        if (!auth.currentUser) {
            alert("Security Alert: Your login session has expired. Please refresh the page and log in again.");
            return;
        }

        const { id } = confirmModal.data;
        setProcessingId(id);
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        try {
            console.log(`Attempting to DELETE user ${id} as admin ${auth.currentUser.uid}`);
            const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
            await deleteUserAccount({ 
                targetUid: id, 
                collectionName: 'users' 
            });
            console.log("User successfully deleted.");
        } catch (error) {
            console.error("Delete failed:", error);
            alert(`Failed to delete user: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // --- 3. HELPER COMPONENTS ---
    const getRoleIcon = (role) => {
        switch(role) {
            case 'admin': return <ShieldCheck size={16} className="text-rose-400" />;
            case 'department': return <Building2 size={16} className="text-violet-400" />;
            case 'mentor': return <Award size={16} className="text-emerald-400" />;
            case 'student': return <GraduationCap size={16} className="text-cyan-400" />;
            default: return <User size={16} className="text-slate-400" />;
        }
    };

    const StatusBadge = ({ status }) => {
        if (status === 'approved') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle size={12}/> Active
            </span>
        );
        if (status === 'pending') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                <AlertTriangle size={12}/> Review
            </span>
        );
        if (status === 'rejected') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                <XCircle size={12}/> Rejected
            </span>
        );
        return <span className="text-slate-500 text-xs">Unknown</span>;
    };

    const ActionButtons = ({ user, status }) => (
        <div className="flex items-center gap-2">
            {processingId === user.id ? (
                <Spinner size="w-5 h-5" />
            ) : (
                <>
                    {status !== 'approved' && (
                        <button 
                            onClick={() => handleStatusChange(user.id, 'approved')}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg transition-all border border-emerald-500/20"
                            title="Approve"
                        >
                            <CheckCircle size={18} />
                        </button>
                    )}
                    
                    {status !== 'rejected' && (
                        <button 
                            onClick={() => handleStatusChange(user.id, 'rejected')}
                            className="p-2 bg-amber-500/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-lg transition-all border border-amber-500/20"
                            title="Reject"
                        >
                            <XCircle size={18} />
                        </button>
                    )}

                    <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>

                    <button 
                        onClick={() => setConfirmModal({ isOpen: true, data: user, type: 'delete' })}
                        className="p-2 bg-slate-700/50 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                </>
            )}
        </div>
    );

    // --- 4. FILTERING ---
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (user.email?.toLowerCase().includes(searchLower)) || 
            (user.displayName?.toLowerCase().includes(searchLower));

        let matchesFilter = true;
        if (filter !== 'all') {
            const userStatus = user.status || 'approved'; 
            matchesFilter = userStatus === filter;
        }
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 px-1">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <p className="text-slate-400 text-sm">Manage access approvals and user security.</p>
            </div>

            {/* --- CONTROLS BAR (Responsive Stack) --- */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 backdrop-blur-sm">
                
                {/* Scrollable Tabs for Mobile */}
                <div className="flex gap-1 p-1 bg-slate-900 rounded-lg overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All Users' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'approved', label: 'Approved' },
                        { id: 'rejected', label: 'Rejected' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                                filter === tab.id 
                                ? 'bg-cyan-600 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Search */}
                <div className="relative w-full lg:w-72 group">
                    <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            
            {/* Loading State */}
            {loading && (
                <div className="flex justify-center p-12 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <Spinner />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700/50 text-slate-500 gap-3">
                    <Search size={40} className="opacity-20"/>
                    <p>No users found matching your filters.</p>
                </div>
            )}

            {/* --- 1. DESKTOP VIEW (Table) --- */}
            {!loading && filteredUsers.length > 0 && (
                <div className="hidden md:block bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">User Identity</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-700/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-base">{user.displayName || 'No Name'}</span>
                                                <span className="text-sm text-slate-400">{user.email}</span>
                                                <span className="text-[10px] text-slate-600 font-mono mt-1 select-all">ID: {user.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-lg w-fit border border-slate-800">
                                                {getRoleIcon(user.role)}
                                                <span className="text-sm capitalize font-medium">{user.role || 'Student'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={user.status || 'approved'} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end">
                                                <ActionButtons user={user} status={user.status || 'approved'} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- 2. MOBILE VIEW (Cards) --- */}
            {!loading && filteredUsers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-white text-lg">{user.displayName || 'No Name'}</h3>
                                    <p className="text-sm text-slate-400 break-all">{user.email}</p>
                                </div>
                                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                                    {getRoleIcon(user.role)}
                                </div>
                            </div>

                            {/* Details Row */}
                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Status</span>
                                    <StatusBadge status={user.status || 'approved'} />
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Role</span>
                                    <span className="text-sm text-slate-300 capitalize">{user.role || 'Student'}</span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3 mt-auto">
                                <span className="text-[10px] text-slate-600 font-mono">ID: {user.id.slice(0, 6)}...</span>
                                <ActionButtons user={user} status={user.status || 'approved'} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- CONFIRMATION MODAL --- */}
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleDeleteUser}
                title="Delete User Permanently?"
                message={
                    <span>
                        Are you sure you want to delete <strong>{confirmModal.data?.email}</strong>? 
                        <br/><br/>
                        <span className="text-red-400 text-sm">
                            This action is irreversible. It will remove the user from Firebase Authentication and delete their profile data.
                        </span>
                    </span>
                }
                confirmText="Yes, Delete User"
                variant="danger"
            />
        </div>
    );
};

export default UserManagement;