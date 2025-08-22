import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import ComplaintCard from './ComplaintCard';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { ListTodo, Clock, CheckCircle, Search } from 'lucide-react';

const ComplaintList = () => {
    const { user, role, complaints, complaintsLoading } = useOutletContext();
    const navigate = useNavigate();

    const [allComplaints, setAllComplaints] = useState(complaints);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedComplaints, setSelectedComplaints] = useState([]);
    
    useEffect(() => {
        const sorted = [...complaints].sort((a, b) => {
            if (a.isEscalated !== b.isEscalated) return a.isEscalated ? -1 : 1;
            if ((a.priorityLevel || 3) !== (b.priorityLevel || 3)) {
                return (a.priorityLevel || 3) - (b.priorityLevel || 3);
            }
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        setAllComplaints(sorted);
    }, [complaints]);

    const handleComplaintUpdate = (updatedComplaint) => {
        setAllComplaints(prev => prev.map(c => c.id === updatedComplaint.id ? updatedComplaint : c));
    };

    // New handler to filter out the deleted complaint from the local state
    const handleComplaintDelete = (deletedComplaintId) => {
        setAllComplaints(prev => prev.filter(c => c.id !== deletedComplaintId));
    };

    const handleSelectComplaint = (id) => {
        setSelectedComplaints(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const handleBulkUpdate = async (status) => {
        const batch = writeBatch(db);
        selectedComplaints.forEach(id => {
            const docRef = doc(db, 'complaints', id);
            batch.update(docRef, { status });
        });
        await batch.commit();
        setSelectedComplaints([]);
    };

    const filteredComplaints = useMemo(() => {
        return allComplaints
            .filter(c => statusFilter === 'All' || c.status === statusFilter)
            .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allComplaints, statusFilter, searchTerm]);

    const stats = useMemo(() => ({
        total: allComplaints.length,
        pending: allComplaints.filter(c => ['Pending', 'In Progress', 'User Responded', 'Re-opened'].includes(c.status)).length,
        resolved: allComplaints.filter(c => c.status === 'Resolved').length,
    }), [allComplaints]);

    if (complaintsLoading) {
        return <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>;
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard delay={0} title="Total Complaints" value={stats.total} icon={<ListTodo className="text-blue-400"/>} colorClass="bg-blue-500" />
                <StatCard delay={1} title="Pending / In Progress" value={stats.pending} icon={<Clock className="text-yellow-400"/>} colorClass="bg-yellow-500" />
                <StatCard delay={2} title="Resolved" value={stats.resolved} icon={<CheckCircle className="text-green-400"/>} colorClass="bg-green-500" />
            </div>
            <div className="bg-slate-800/50 backdrop-blur-xl p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700/50">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">{role === 'student' ? 'Your Complaint History' : 'Manage Complaints'}</h2>
                    {role !== 'student' && selectedComplaints.length > 0 && (
                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                            <span className="text-sm text-slate-400">{selectedComplaints.length} selected</span>
                            <button onClick={() => handleBulkUpdate('Resolved')} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700">Mark as Resolved</button>
                        </div>
                    )}
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                        <input type="text" placeholder="Search by title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-11 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-3 border border-slate-700 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option>All</option><option>Pending</option><option>In Progress</option><option>Responded</option><option>User Responded</option><option>Resolved</option><option>Re-opened</option>
                    </select>
                </div>
                <div className="space-y-4">
                    <AnimatePresence>
                        {filteredComplaints.length > 0 ? (
                            filteredComplaints.map(c => (
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
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center text-slate-400 py-12">
                                <p className="text-lg">
                                    {allComplaints.length === 0 ? (
                                        role === 'student' ? "You haven't filed any complaints yet." :
                                        role === 'admin' ? "There are no complaints in the system yet." :
                                        "No complaints are assigned to this department."
                                    ) : "No complaints match your current filter."}
                                </p>
                                {role === 'student' && allComplaints.length === 0 && (
                                    <button onClick={() => navigate('/new-complaint')} className="mt-4 px-6 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600">File your first complaint</button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default ComplaintList;