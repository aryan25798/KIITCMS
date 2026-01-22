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
    getCountFromServer
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase'; 
import { motion, AnimatePresence } from 'framer-motion';
import ComplaintCard from './ComplaintCard';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { ListTodo, Clock, CheckCircle, Search, ChevronDown, RefreshCw, Filter } from 'lucide-react';

const PAGE_SIZE = 10;

const ComplaintList = () => {
    const { user, role } = useOutletContext();
    const navigate = useNavigate();
    
    // Track mount state to prevent updates after unmount
    const isMounted = useRef(true);

    // Server-Side Data State
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState(null); 
    const [hasMore, setHasMore] = useState(true);

    // Filters & Search
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedComplaints, setSelectedComplaints] = useState([]);
    
    // Stats State
    const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });

    // ✅ ADDED: Tracks if the initial fetch attempt is finished to stop flickering
    const [firstFetchDone, setFirstFetchDone] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // --- Helper: Build Query Constraints based on Role ---
    const getRoleConstraints = useCallback(() => {
        // 1. Safety Check: If user/auth is missing, return null to stop query
        if (!user || !role || !auth.currentUser) return null; 

        if (role === 'student') {
            return [where('userId', '==', user.uid)];
        } 
        
        if (role === 'department') {
            const deptPrefix = user.email.split('@')[0].toLowerCase();
            const deptMap = { 
                'it': 'IT Department', 
                'maintenance': 'Maintenance', 
                'hostel': 'Hostel Affairs', 
                'academics': 'Academics',
                'library': 'Library' 
            };
            const departmentName = deptMap[deptPrefix];
            
            // 2. Secure Fallback:
            // If we can't map the department, we MUST return a query that matches nothing.
            // Returning [] (empty array) would query ALL complaints, causing a 403 Permission Denied.
            if (departmentName) {
                return [where('assignedDept', '==', departmentName)];
            } else {
                console.warn("Unknown department prefix:", deptPrefix);
                return [where('assignedDept', '==', 'INVALID_DEPT_GUARD')];
            }
        }

        if (role === 'admin') {
            return []; // Admin sees everything
        }

        return null;
    }, [user, role]);

    // --- 1. Fetch Stats (Optimized) ---
    const fetchStats = useCallback(async () => {
        if (!auth.currentUser) return; // Prevent logout race condition

        const constraints = getRoleConstraints();
        if (!constraints) return;
        
        try {
            const coll = collection(db, 'complaints');
            
            // Execute Count Queries
            const [totalSnap, resolvedSnap] = await Promise.all([
                getCountFromServer(query(coll, ...constraints)),
                getCountFromServer(query(coll, ...constraints, where('status', '==', 'Resolved')))
            ]);

            if (isMounted.current) {
                const total = totalSnap.data().count;
                const resolved = resolvedSnap.data().count;
                const pending = total - resolved;
                setStats({ total, pending, resolved });
            }
        } catch (error) {
            if (error.code === 'permission-denied') return;
            console.error("Error fetching stats:", error);
        }
    }, [getRoleConstraints]);

    // --- 2. Fetch Complaints (Pagination) ---
    const fetchComplaints = useCallback(async (isNextPage = false) => {
        if (!auth.currentUser) return; // Prevent logout race condition

        const roleConstraints = getRoleConstraints();
        if (!roleConstraints) return;
        
        try {
            if (isMounted.current) {
                if (isNextPage) setLoadingMore(true);
                else setLoading(true);
            }

            let q = collection(db, 'complaints');
            const constraints = [...roleConstraints];

            // Status Filter
            if (statusFilter !== 'All') {
                constraints.push(where('status', '==', statusFilter));
            }

            // Sorting & Pagination
            constraints.push(orderBy('createdAt', 'desc'));
            
            if (isNextPage && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }
            
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

            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            setLastDoc(lastVisible);
            setHasMore(snapshot.docs.length === PAGE_SIZE);

            // ✅ Mark first fetch attempt as complete
            setFirstFetchDone(true);

        } catch (error) {
            if (error.code === 'permission-denied') return;
            console.error("Error fetching complaints:", error);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [getRoleConstraints, statusFilter, lastDoc]);

    // Initial Load & Filter Change
    useEffect(() => {
        if (user && role) {
            setLastDoc(null);
            fetchComplaints(false);
            fetchStats();
        }
    }, [statusFilter, user, role, fetchComplaints, fetchStats]);

    // --- Handlers ---

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchComplaints(true);
        }
    };

    const handleComplaintUpdate = (updatedComplaint) => {
        setComplaints(prev => prev.map(c => c.id === updatedComplaint.id ? updatedComplaint : c));
    };

    const handleComplaintDelete = (deletedComplaintId) => {
        setComplaints(prev => prev.filter(c => c.id !== deletedComplaintId));
        setStats(prev => ({ ...prev, total: prev.total - 1 })); 
    };

    const handleSelectComplaint = (id) => {
        setSelectedComplaints(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const handleBulkUpdate = async (status) => {
        if (selectedComplaints.length === 0) return;
        try {
            const batch = writeBatch(db);
            selectedComplaints.forEach(id => {
                const docRef = doc(db, 'complaints', id);
                batch.update(docRef, { status });
            });
            await batch.commit();
            
            if (isMounted.current) {
                setComplaints(prev => prev.map(c => 
                    selectedComplaints.includes(c.id) ? { ...c, status } : c
                ));
                setSelectedComplaints([]);
                fetchStats(); 
            }
        } catch (error) {
            console.error("Error updating complaints:", error);
        }
    };

    const displayedComplaints = complaints.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ✅ FIXED: Show full spinner only on very first load before we have any data results
    if (loading && !firstFetchDone) {
        return <div className="flex justify-center p-24"><Spinner size="h-12 w-12" color="border-cyan-400" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* --- Stats Section (Responsive Grid) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <StatCard delay={0} title="Total Complaints" value={stats.total} icon={<ListTodo className="text-blue-400"/>} colorClass="bg-blue-500" />
                <StatCard delay={1} title="Pending / In Progress" value={stats.pending} icon={<Clock className="text-yellow-400"/>} colorClass="bg-yellow-500" />
                <StatCard delay={2} title="Resolved" value={stats.resolved} icon={<CheckCircle className="text-green-400"/>} colorClass="bg-green-500" />
            </div>

            {/* --- Main Content Area --- */}
            <div className="bg-slate-800/50 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-700/50">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {role === 'student' ? 'My Complaints' : 'Complaint Management'}
                    </h2>
                    
                    {/* Admin Bulk Actions */}
                    {role !== 'student' && selectedComplaints.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 bg-cyan-950/50 border border-cyan-500/30 px-3 py-2 rounded-lg"
                        >
                            <span className="text-sm text-cyan-200 font-medium">{selectedComplaints.length} selected</span>
                            <div className="h-4 w-px bg-cyan-500/30"></div>
                            <button 
                                onClick={() => handleBulkUpdate('Resolved')} 
                                className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors uppercase tracking-wide"
                            >
                                Mark Resolved
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Filters & Search Toolbar */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    {/* Search Bar */}
                    <div className="relative flex-grow group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Search by title..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-11 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                        />
                    </div>
                    
                    {/* Filters & Refresh */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-3">
                        <div className="relative w-full sm:w-auto">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18}/>
                            <select 
                                value={statusFilter} 
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    setComplaints([]); 
                                    setLastDoc(null);
                                }} 
                                className="w-full sm:w-48 appearance-none p-3 pl-10 pr-10 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer hover:bg-slate-800 transition-colors"
                            >
                                <option value="All">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Responded">Responded</option>
                                <option value="User Responded">User Responded</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Re-opened">Re-opened</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setComplaints([]);
                                setLastDoc(null);
                                fetchComplaints(false);
                                fetchStats();
                            }}
                            className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 active:scale-95 transition-all flex-shrink-0 shadow-lg shadow-slate-900/20"
                            title="Refresh List"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>

                {/* Complaint List */}
                <div className="space-y-4">
                    <AnimatePresence>
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
                            // ✅ FIXED: Only show "No complaints" if loading is false AND the backend check is complete
                            !loading && firstFetchDone && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/10"
                                >
                                    <div className="h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                        <ListTodo size={40} className="text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">No complaints found</h3>
                                    <p className="text-slate-400 max-w-sm mx-auto">
                                        {searchTerm || statusFilter !== 'All' 
                                            ? "Try adjusting your filters or search terms." 
                                            : "There are no complaints to display at this time."}
                                    </p>
                                    
                                    {role === 'student' && complaints.length === 0 && statusFilter === 'All' && !searchTerm && (
                                        <button 
                                            onClick={() => navigate('/portal/new-complaint')} 
                                            className="mt-6 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95"
                                        >
                                            Submit New Complaint
                                        </button>
                                    )}
                                </motion.div>
                            )
                        )}
                    </AnimatePresence>

                    {/* Load More Button */}
                    {hasMore && displayedComplaints.length > 0 && (
                        <div className="flex justify-center pt-6 pb-2">
                            <button 
                                onClick={handleLoadMore} 
                                disabled={loadingMore}
                                className="group flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-all disabled:opacity-50 border border-slate-700 active:scale-95"
                            >
                                {loadingMore ? (
                                    <Spinner size="h-4 w-4" color="border-current" />
                                ) : (
                                    <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                                )}
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