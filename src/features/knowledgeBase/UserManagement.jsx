import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
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
    Filter
} from 'lucide-react';

const UserManagement = () => {
    // --- STATE MANAGEMENT ---
    const [systemUsers, setSystemUsers] = useState([]);
    const [mentorUsers, setMentorUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null); 
    
    // Modal State
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        data: null, 
        type: null 
    });

    // --- 1. DUAL REAL-TIME FETCHING ---
    useEffect(() => {
        setLoading(true);

        // A. Fetch System Users (Admins, Dept Staff, Students)
        // Uses 'createdAt' for sorting
        const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                // CRITICAL: Tag origin so we know which collection to update later
                _collection: 'users' 
            }));
            setSystemUsers(fetchedUsers);
        }, (error) => console.error("Error fetching system users:", error));

        // B. Fetch Mentors (From 'mentors' collection)
        // Mentors might not have 'createdAt', so we fetch all and sort client-side if needed
        const qMentors = collection(db, 'mentors'); 
        const unsubscribeMentors = onSnapshot(qMentors, (snapshot) => {
            const fetchedMentors = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                role: 'mentor', // Force role for UI consistency
                _collection: 'mentors' // Tag origin
            }));
            setMentorUsers(fetchedMentors);
        }, (error) => console.error("Error fetching mentors:", error));

        // Cleanup listeners on unmount
        return () => {
            unsubscribeUsers();
            unsubscribeMentors();
        };
    }, []);

    // Check loading state synchronization
    useEffect(() => {
        if (systemUsers.length > 0 || mentorUsers.length > 0) {
            setLoading(false);
        }
        // Safety timeout in case both are empty
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
    }, [systemUsers, mentorUsers]);

    // --- 2. DATA PROCESSING ---
    
    // Combine, Sort, and Filter Data
    const processedUsers = useMemo(() => {
        // 1. Merge Lists
        const combined = [...systemUsers, ...mentorUsers];

        // 2. Sort by Date (Newest First)
        combined.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        // 3. Filter
        return combined.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            const name = user.displayName || user.name || ''; // Mentors use 'name', Users use 'displayName'
            const email = user.email || '';
            const role = user.role || '';

            // Search Logic
            const matchesSearch = 
                name.toLowerCase().includes(searchLower) || 
                email.toLowerCase().includes(searchLower) ||
                role.toLowerCase().includes(searchLower);

            // Status Filter Logic
            let matchesStatus = true;
            if (filterStatus !== 'all') {
                const userStatus = user.status || 'pending'; 
                matchesStatus = userStatus === filterStatus;
            }

            return matchesSearch && matchesStatus;
        });
    }, [systemUsers, mentorUsers, searchTerm, filterStatus]);

    // --- 3. ACTIONS ---
    
    // Approve or Reject a user/mentor
    const handleStatusChange = async (user, newStatus) => {
        if (!auth.currentUser) {
            alert("Security Alert: Your session has expired. Please login again.");
            return;
        }

        setProcessingId(user.id);
        try {
            console.log(`Setting status '${newStatus}' for ${user.id} in collection '${user._collection}'`);
            
            const updateUserStatus = httpsCallable(functions, 'updateUserStatus');
            await updateUserStatus({ 
                targetUid: user.id, 
                status: newStatus, 
                collectionName: user._collection // ✅ Dynamic Collection Switching
            });
            
            // UI updates automatically via snapshot listener
        } catch (error) {
            console.error("Status update failed:", error);
            alert(`Failed to ${newStatus} user: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Permanently Delete a user/mentor
    const handleDeleteUser = async () => {
        if (!auth.currentUser) return;

        const { id, _collection } = confirmModal.data;
        setProcessingId(id);
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        try {
            console.log(`Deleting user ${id} from collection ${_collection}`);
            const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
            await deleteUserAccount({ 
                targetUid: id, 
                collectionName: _collection // ✅ Dynamic Collection Switching
            });
        } catch (error) {
            console.error("Delete failed:", error);
            alert(`Failed to delete user: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // --- 4. UI COMPONENTS ---

    const RoleBadge = ({ role }) => {
        const r = role?.toLowerCase() || 'student';
        const styles = {
            admin: "text-rose-400 bg-rose-400/10 border-rose-400/20",
            department: "text-violet-400 bg-violet-400/10 border-violet-400/20",
            mentor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
            student: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
        };
        
        const icons = {
            admin: <ShieldCheck size={14} />,
            department: <Building2 size={14} />,
            mentor: <Award size={14} />,
            student: <GraduationCap size={14} />
        };

        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[r] || styles.student}`}>
                {icons[r] || <User size={14}/>}
                <span className="capitalize">{r}</span>
            </div>
        );
    };

    const StatusBadge = ({ status }) => {
        const s = status?.toLowerCase() || 'pending';
        if (s === 'approved') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                <CheckCircle size={12}/> Active
            </span>
        );
        if (s === 'pending') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                <AlertTriangle size={12}/> Review
            </span>
        );
        if (s === 'rejected') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                <XCircle size={12}/> Rejected
            </span>
        );
        return <span className="text-slate-500 text-xs">Unknown</span>;
    };

    const ActionButtons = ({ user }) => {
        const status = user.status || 'pending';
        return (
            <div className="flex items-center gap-2">
                {processingId === user.id ? (
                    <Spinner size="w-5 h-5" />
                ) : (
                    <>
                        {/* Approval Actions */}
                        {status !== 'approved' && (
                            <button 
                                onClick={() => handleStatusChange(user, 'approved')}
                                className="p-2 bg-green-500/10 hover:bg-green-600 text-green-500 hover:text-white rounded-lg transition-all border border-green-500/20"
                                title="Approve Account"
                            >
                                <CheckCircle size={18} />
                            </button>
                        )}
                        
                        {status !== 'rejected' && (
                            <button 
                                onClick={() => handleStatusChange(user, 'rejected')}
                                className="p-2 bg-amber-500/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-lg transition-all border border-amber-500/20"
                                title="Reject / Suspend"
                            >
                                <XCircle size={18} />
                            </button>
                        )}

                        <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>

                        {/* Destructive Actions */}
                        <button 
                            onClick={() => setConfirmModal({ isOpen: true, data: user, type: 'delete' })}
                            className="p-2 bg-slate-700/50 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Permanently Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 px-1">
                <h2 className="text-2xl font-bold text-white">Unified User Management</h2>
                <p className="text-slate-400 text-sm">Manage Admins, Department Staff, and Mentors in one centralized dashboard.</p>
            </div>

            {/* --- CONTROLS BAR --- */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl">
                
                {/* Status Tabs */}
                <div className="flex gap-1 p-1 bg-slate-900 rounded-xl overflow-x-auto no-scrollbar border border-slate-800">
                    {[
                        { id: 'all', label: 'All Users' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'approved', label: 'Active' },
                        { id: 'rejected', label: 'Rejected' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                                filterStatus === tab.id 
                                ? 'bg-cyan-600 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Search */}
                <div className="relative w-full lg:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search name, email, or role..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            
            {/* Loading State */}
            {loading && (
                <div className="flex justify-center p-20 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <Spinner size="w-8 h-8" />
                </div>
            )}

            {/* Empty State */}
            {!loading && processedUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-16 text-center bg-slate-800/30 rounded-2xl border border-slate-700/50 text-slate-500 gap-4">
                    <div className="p-4 bg-slate-800 rounded-full">
                        <Filter size={32} className="opacity-50"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-300">No users found</h3>
                        <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                </div>
            )}

            {/* --- DESKTOP VIEW (Table) --- */}
            {!loading && processedUsers.length > 0 && (
                <div className="hidden md:block bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold tracking-wider">User Identity</th>
                                    <th className="px-6 py-4 font-semibold tracking-wider">Role & Origin</th>
                                    <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {processedUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-base">
                                                    {user.displayName || user.name || 'No Name'}
                                                </span>
                                                <span className="text-sm text-slate-400">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <RoleBadge role={user.role} />
                                                <span className="text-[10px] text-slate-500 font-mono mt-1">
                                                    Source: {user._collection.toUpperCase()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end">
                                                <ActionButtons user={user} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MOBILE VIEW (Cards) --- */}
            {!loading && processedUsers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                    {processedUsers.map(user => (
                        <div key={user.id} className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-white text-lg">{user.displayName || user.name || 'No Name'}</h3>
                                    <p className="text-sm text-slate-400 break-all">{user.email}</p>
                                </div>
                                <RoleBadge role={user.role} />
                            </div>

                            {/* Details Row */}
                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Status</span>
                                    <StatusBadge status={user.status} />
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Source</span>
                                    <span className="text-xs text-slate-400 font-mono uppercase">{user._collection}</span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3 mt-auto bg-slate-900/30 -mx-5 -mb-5 p-4 rounded-b-2xl">
                                <span className="text-[10px] text-slate-600 font-mono">ID: {user.id.slice(0, 6)}...</span>
                                <ActionButtons user={user} />
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
                title="Delete Account Permanently?"
                message={
                    <span>
                        Are you sure you want to delete <strong>{confirmModal.data?.email}</strong>? 
                        <br/><br/>
                        {/* ✅ FIX: Use span with block display instead of div inside p */}
                        <span className="block p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                            <span className="flex items-center gap-2 mb-1 font-bold">
                                <AlertTriangle size={16} className="text-red-400"/>
                                Warning:
                            </span>
                            This action deletes the account from Authentication and the <strong>{confirmModal.data?._collection}</strong> database. It cannot be undone.
                        </span>
                    </span>
                }
                confirmText="Yes, Delete Account"
                variant="danger"
            />
        </div>
    );
};

export default UserManagement;