import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs, 
    writeBatch, 
    doc,
    getDoc,
    getCountFromServer
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase'; 
import { motion, AnimatePresence } from 'framer-motion';
import ComplaintCard from './ComplaintCard';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { ListTodo, Clock, CheckCircle, Search, ChevronDown, RefreshCw, Filter, AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 10;

// ✅ MAPPING: Normalize User Profile Departments to Complaint Departments
const DEPT_MAPPING = {
    'IT': 'IT Department',
    'MAINTENANCE': 'Maintenance',
    'HOSTEL': 'Hostel Affairs',
    'ACADEMICS': 'Academics',
    'LIBRARY': 'Library',
    'ADMIN': 'Admin'
};

const ComplaintList = () => {
    const { user, role } = useOutletContext();
    const navigate = useNavigate();
    
    // ✅ Stable Primitives for Dependencies
    const userId = user?.uid;
    const userEmail = user?.email;
    
    const isMounted = useRef(true);

    // State
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState(null); 
    const [hasMore, setHasMore] = useState(true);
    const [departmentName, setDepartmentName] = useState(null);
    const [permissionError, setPermissionError] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedComplaints, setSelectedComplaints] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
    
    // Flag to prevent empty state flash
    const [firstFetchDone, setFirstFetchDone] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // --- 1. RESOLVE DEPARTMENT NAME ---
    useEffect(() => {
        const resolveDepartment = async () => {
            if (role === 'department' && userId) {
                // Strategy 1: Email Prefix (Fastest)
                if (userEmail) {
                    const prefix = userEmail.split('@')[0].toUpperCase();
                    if (DEPT_MAPPING[prefix]) {
                        if (isMounted.current) setDepartmentName(DEPT_MAPPING[prefix]);
                        return;
                    }
                }

                // Strategy 2: Firestore Profile (Source of Truth)
                try {
                    const userDocRef = doc(db, 'users', userId);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists() && isMounted.current) {
                        const rawName = userSnap.data().departmentName?.toUpperCase();
                        const fullName = DEPT_MAPPING[rawName] || rawName || 'Unassigned';
                        setDepartmentName(fullName);
                    }
                } catch (error) {
                    console.error("Error resolving department:", error);
                }
            }
        };
        resolveDepartment();
    }, [userId, role, userEmail]);

    // --- Helper: Build Query Constraints ---
    const getRoleConstraints = useCallback(() => {
        if (!userId || !role || !auth.currentUser) return null; 

        if (role === 'student') {
            return [where('userId', '==', userId)];
        } 
        
        if (role === 'department') {
            // Strictly wait for department name to prevent 403 errors
            if (!departmentName) return null;
            return [where('assignedDept', '==', departmentName)];
        }

        if (role === 'admin') {
            return []; 
        }

        return null;
    }, [userId, role, departmentName]);

    // --- 2. Fetch Stats ---
    const fetchStats = useCallback(async () => {
        if (!auth.currentUser) return; 

        const constraints = getRoleConstraints();
        if (!constraints) return;
        
        try {
            const coll = collection(db, 'complaints');
            const [totalSnap, resolvedSnap] = await Promise.all([
                getCountFromServer(query(coll, ...constraints)),
                getCountFromServer(query(coll, ...constraints, where('status', '==', 'Resolved')))
            ]);

            if (isMounted.current) {
                const total = totalSnap.data().count;
                const resolved = resolvedSnap.data().count;
                setStats({ total, pending: total - resolved, resolved });
            }
        } catch (error) {
            // Silently fail on stats if permission denied, main fetch will handle error UI
            if (error.code !== 'permission-denied') console.error("Error stats:", error);
        }
    }, [getRoleConstraints]);

    // --- 3. Fetch Complaints ---
    const fetchComplaints = useCallback(async (isNextPage = false) => {
        if (!auth.currentUser) return;

        const roleConstraints = getRoleConstraints();
        if (!roleConstraints) return; 
        
        try {
            if (isMounted.current) {
                if (isNextPage) setLoadingMore(true);
                else setLoading(true);
            }

            let q = collection(db, 'complaints');
            const constraints = [...roleConstraints];

            if (statusFilter !== 'All') constraints.push(where('status', '==', statusFilter));
            constraints.push(orderBy('createdAt', 'desc'));
            if (isNextPage && lastDoc) constraints.push(startAfter(lastDoc));
            constraints.push(limit(PAGE_SIZE));

            const finalQuery = query(q, ...constraints);
            const snapshot = await getDocs(finalQuery);

            if (!isMounted.current) return;

            const newComplaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isNextPage) {
                setComplaints(prev => [...prev, ...newComplaints]);
            } else {
                setComplaints(newComplaints);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === PAGE_SIZE);
            setFirstFetchDone(true);
            setPermissionError(false);

        } catch (error) {
            console.error("Error fetching complaints:", error);
            if (error.code === 'permission-denied') {
                if (isMounted.current) {
                    setPermissionError(true);
                    setFirstFetchDone(true); // Stop spinner to show error UI
                    setLoading(false);
                }
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [getRoleConstraints, statusFilter, lastDoc]);

    // --- CRITICAL LOOP FIX: Main Effect ---
    // We intentionally OMIT fetchComplaints/fetchStats from the dependency array.
    // They are updated when 'lastDoc' changes, which would cause an infinite loop.
    useEffect(() => {
        if (userId && role) {
            if (role === 'department' && !departmentName) return;

            setLastDoc(null);
            fetchComplaints(false);
            fetchStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, userId, role, departmentName]); 

    // --- Handlers ---
    const handleLoadMore = () => { if (!loadingMore && hasMore) fetchComplaints(true); };
    const handleComplaintUpdate = (upd) => setComplaints(prev => prev.map(c => c.id === upd.id ? upd : c));
    const handleComplaintDelete = (id) => {
        setComplaints(prev => prev.filter(c => c.id !== id));
        setStats(prev => ({ ...prev, total: prev.total - 1 })); 
    };
    const handleSelectComplaint = (id) => {
        setSelectedComplaints(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
    };
    const handleBulkUpdate = async (status) => {
        if (selectedComplaints.length === 0) return;
        const batch = writeBatch(db);
        selectedComplaints.forEach(id => batch.update(doc(db, 'complaints', id), { status }));
        await batch.commit();
        setComplaints(prev => prev.map(c => selectedComplaints.includes(c.id) ? { ...c, status } : c));
        setSelectedComplaints([]);
        fetchStats(); 
    };

    const displayedComplaints = complaints.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- Render: Loading State ---
    if (loading && !firstFetchDone) {
        return <div className="flex justify-center items-center py-20"><Spinner size="h-12 w-12" color="border-cyan-400" /></div>;
    }

    // --- Render: Permission Error (Department Mismatch) ---
    if (permissionError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-red-500/30 bg-red-500/10 rounded-xl p-6">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
                <p className="text-red-200 max-w-md">
                    We could not fetch complaints for your department <strong>({departmentName})</strong>. 
                    This usually happens if your account department doesn't match the complaints database.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0"> {/* Padding for mobile floaters */}
            
            {/* Stats - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard delay={0} title="Total" value={stats.total} icon={<ListTodo className="text-blue-400"/>} colorClass="bg-blue-500" />
                <StatCard delay={1} title="Pending" value={stats.pending} icon={<Clock className="text-yellow-400"/>} colorClass="bg-yellow-500" />
                <StatCard delay={2} title="Resolved" value={stats.resolved} icon={<CheckCircle className="text-green-400"/>} colorClass="bg-green-500" />
            </div>

            {/* Main Container */}
            <div className="bg-slate-800/50 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-700/50">
                
                {/* Header Actions - Stack on Mobile */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        {role === 'student' ? 'My Complaints' : 'Complaint Inbox'}
                        {role === 'department' && departmentName && (
                            <span className="hidden sm:inline-block px-2 py-1 text-xs font-normal bg-slate-700 rounded-full text-slate-300 border border-slate-600">
                                {departmentName}
                            </span>
                        )}
                    </h2>
                    
                    {/* Bulk Actions */}
                    {role !== 'student' && selectedComplaints.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full md:w-auto flex items-center justify-between gap-3 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-xl">
                            <span className="text-sm text-cyan-200">{selectedComplaints.length} selected</span>
                            <button onClick={() => handleBulkUpdate('Resolved')} className="text-xs font-bold text-green-400 uppercase tracking-wider">Mark Resolved</button>
                        </motion.div>
                    )}
                </div>

                {/* Filters - Responsive Grid */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                    {/* Search */}
                    <div className="relative flex-grow group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Search title..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full p-3 pl-11 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all" 
                        />
                    </div>
                    
                    {/* Dropdown & Refresh */}
                    <div className="flex gap-2">
                        <div className="relative flex-grow md:flex-grow-0 md:w-48">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18}/>
                            <select 
                                value={statusFilter} 
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    setComplaints([]); 
                                    setLastDoc(null);
                                    setFirstFetchDone(false);
                                    setLoading(true);
                                }} 
                                className="w-full h-full p-3 pl-10 pr-10 bg-slate-900/50 border border-slate-700 rounded-xl text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50"
                            >
                                {['All', 'Pending', 'In Progress', 'Responded', 'Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setComplaints([]);
                                setLastDoc(null);
                                setFirstFetchDone(false);
                                setLoading(true);
                                fetchComplaints(false);
                                fetchStats();
                            }}
                            className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 active:scale-95 transition-all shadow-lg"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>

                {/* List Content */}
                <div className="space-y-4 min-h-[300px]">
                    <AnimatePresence mode='popLayout'>
                        {displayedComplaints.length > 0 ? (
                            displayedComplaints.map(c => (
                                <ComplaintCard 
                                    key={c.id} 
                                    complaint={c} 
                                    role={role} 
                                    user={user} 
                                    onUpdate={handleComplaintUpdate} 
                                    onDelete={handleComplaintDelete} 
                                    onSelect={handleSelectComplaint} 
                                    isSelected={selectedComplaints.includes(c.id)} 
                                />
                            ))
                        ) : (
                            !loading && firstFetchDone && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/10"
                                >
                                    <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-4 ring-slate-800/50">
                                        <ListTodo size={32} className="text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">No complaints found</h3>
                                    <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
                                        {searchTerm || statusFilter !== 'All' 
                                            ? "Try adjusting your search or filters." 
                                            : "You're all caught up! No complaints to display."}
                                    </p>
                                    {role === 'student' && complaints.length === 0 && statusFilter === 'All' && !searchTerm && (
                                        <button onClick={() => navigate('/portal/new-complaint')} className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition-all active:scale-95 text-sm">
                                            Submit New Complaint
                                        </button>
                                    )}
                                </motion.div>
                            )
                        )}
                    </AnimatePresence>

                    {/* Load More */}
                    {hasMore && displayedComplaints.length > 0 && (
                        <div className="flex justify-center pt-4">
                            <button onClick={handleLoadMore} disabled={loadingMore} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-slate-300 rounded-full border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50">
                                {loadingMore ? <Spinner size="h-4 w-4" color="border-current" /> : <ChevronDown size={18} />}
                                <span className="font-medium text-sm">{loadingMore ? 'Loading...' : 'Load More'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintList;