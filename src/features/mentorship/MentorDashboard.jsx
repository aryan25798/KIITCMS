import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, writeBatch, doc, updateDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import MentorProfileManagement from './MentorProfileManagement';
import ScheduleMeeting from './ScheduleMeeting';
import Spinner from '../../components/ui/Spinner';
import StatusPill from '../../components/ui/StatusPill';
import { 
    MessageSquare, 
    UserX, 
    CheckCircle, 
    AlertCircle, 
    X, 
    Users, 
    Calendar, 
    FileText, 
    User,
    Inbox
} from 'lucide-react';

const MentorDashboard = () => {
    const { user, mentorData, setMentorData, onChat } = useOutletContext();
    
    const [requests, setRequests] = useState([]);
    const [leaveApps, setLeaveApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('requests');
    const [menteeToRemove, setMenteeToRemove] = useState(null);
    const [toast, setToast] = useState(null);

    // --- Toast Logic ---
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message, type = 'success') => setToast({ message, type });

    // --- Data Fetching ---
    useEffect(() => {
        setLoading(true);
        if (!user?.uid) return;

        const qRequests = query(collection(db, 'mentorRequests'), where('mentorId', '==', user.uid));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qLeave = query(collection(db, 'leaveApplications'), where('mentorId', '==', user.uid));
        const unsubLeave = onSnapshot(qLeave, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            apps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setLeaveApps(apps);
            setLoading(false);
        });

        return () => {
            unsubRequests();
            unsubLeave();
        };
    }, [user.uid]);

    // --- Handlers ---
    const handleRequestUpdate = async (id, status, studentId) => {
        try {
            const batch = writeBatch(db);
            const requestRef = doc(db, 'mentorRequests', id);
            batch.update(requestRef, { status });

            if (status === 'accepted') {
                const connectionRef = doc(db, 'studentConnections', studentId);
                batch.set(connectionRef, {
                    studentId: studentId,
                    mentorId: user.uid,
                    connectedAt: serverTimestamp()
                });
            }
            await batch.commit();
            await createNotification({
                recipientId: studentId,
                message: `Your mentorship request has been ${status}.`,
                type: 'mentor_response'
            });
            showToast(`Request ${status} successfully.`);
        } catch (error) {
            showToast("Failed to process request.", 'error');
        }
    };

    const handleLeaveUpdate = async (id, status, studentId) => {
        try {
            await updateDoc(doc(db, 'leaveApplications', id), { status });
            await createNotification({
                recipientId: studentId,
                message: `Your leave application has been ${status} by your mentor.`,
                leaveId: id,
                type: 'leave_response'
            });
            showToast(`Leave application ${status}.`);
        } catch (error) {
            showToast("Failed to update leave status.", 'error');
        }
    };
    
    const handleRemoveMentee = async (studentId) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'studentConnections', studentId));
            
            const q = query(
                collection(db, 'mentorRequests'), 
                where('studentId', '==', studentId), 
                where('mentorId', '==', user.uid), 
                where('status', '==', 'accepted')
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => batch.delete(doc.ref));

            await batch.commit();
            showToast('Mentee removed successfully.');
        } catch (error) {
            showToast('Failed to remove mentee.', 'error');
        } finally {
            setMenteeToRemove(null);
        }
    };

    const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
    const acceptedRequests = useMemo(() => requests.filter(r => r.status === 'accepted'), [requests]);
    const pendingLeave = useMemo(() => leaveApps.filter(a => a.status === 'Pending'), [leaveApps]);

    // --- Helper Components ---
    const TabButton = ({ id, label, icon: Icon, count }) => (
        <button 
            onClick={() => setActiveView(id)} 
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeView === id 
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' 
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
        >
            <Icon size={18} />
            <span>{label}</span>
            {count > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    activeView === id ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-white">Mentor Dashboard</h2>
                <p className="text-slate-400">Manage your students and mentorship activities.</p>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-x-auto">
                <div className="flex w-full min-w-max">
                    <TabButton id="requests" label="Requests" icon={Inbox} count={pendingRequests.length} />
                    <TabButton id="mentees" label="My Mentees" icon={Users} count={acceptedRequests.length} />
                    <TabButton id="leave" label="Leave Approvals" icon={FileText} count={pendingLeave.length} />
                    <TabButton id="schedule" label="Schedule" icon={Calendar} />
                    <TabButton id="profile" label="Profile" icon={User} />
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeView}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeView === 'requests' && (
                        <div className="grid gap-4">
                            {loading ? <Spinner /> : pendingRequests.length > 0 ? (
                                pendingRequests.map(req => (
                                    <div key={req.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between gap-4 transition-all hover:border-slate-600">
                                        <div>
                                            <h4 className="font-bold text-lg text-white">{req.studentName}</h4>
                                            <p className="text-sm text-slate-400 mb-2">{req.studentEmail}</p>
                                            <div className="bg-slate-900/50 p-3 rounded-lg text-sm text-slate-300 border border-slate-700/50">
                                                "{req.purpose}"
                                            </div>
                                        </div>
                                        <div className="flex gap-3 sm:flex-col justify-end">
                                            <button onClick={() => handleRequestUpdate(req.id, 'accepted', req.studentId)} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium">
                                                <CheckCircle size={16}/> Accept
                                            </button>
                                            <button onClick={() => handleRequestUpdate(req.id, 'rejected', req.studentId)} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-rose-600 hover:text-white text-slate-300 rounded-lg transition-colors text-sm font-medium">
                                                <X size={16}/> Decline
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                                    <Inbox size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>No pending mentorship requests.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'mentees' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loading ? <Spinner /> : acceptedRequests.length > 0 ? (
                                acceptedRequests.map(req => (
                                    <div key={req.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 hover:border-cyan-500/30 transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white">
                                                {req.studentName.charAt(0)}
                                            </div>
                                            <button onClick={() => setMenteeToRemove(req)} className="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Remove Mentee">
                                                <UserX size={18} />
                                            </button>
                                        </div>
                                        <h4 className="font-bold text-white truncate">{req.studentName}</h4>
                                        <p className="text-sm text-slate-400 truncate mb-4">{req.studentEmail}</p>
                                        <button 
                                            onClick={() => onChat({ uid: req.studentId, name: req.studentName })}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm font-medium"
                                        >
                                            <MessageSquare size={16} /> Message
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                                    <Users size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>You haven't accepted any mentees yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'leave' && (
                        <div className="space-y-4">
                            {loading ? <Spinner /> : leaveApps.length > 0 ? (
                                leaveApps.map(app => (
                                    <div key={app.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-white">{app.userName}</h4>
                                                <StatusPill status={app.status} />
                                            </div>
                                            <p className="text-sm text-slate-300">
                                                <span className="text-slate-500">Reason:</span> {app.reason}
                                            </p>
                                            <p className="text-sm text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded w-fit">
                                                {app.fromDate} <span className="text-slate-600">→</span> {app.toDate}
                                            </p>
                                        </div>
                                        
                                        {app.status === 'Pending' && (
                                            <div className="flex gap-3 items-center">
                                                <button onClick={() => handleLeaveUpdate(app.id, 'Approved', app.userId)} className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-sm font-medium">
                                                    Approve
                                                </button>
                                                <button onClick={() => handleLeaveUpdate(app.id, 'Rejected', app.userId)} className="px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-600/50 hover:bg-rose-600 hover:text-white rounded-lg transition-all text-sm font-medium">
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>No leave requests found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'schedule' && <ScheduleMeeting user={user} mentees={acceptedRequests} />}
                    {activeView === 'profile' && <MentorProfileManagement user={user} mentorData={mentorData} onUpdate={setMentorData} />}
                </motion.div>
            </AnimatePresence>

            {/* Modal & Toast */}
            {menteeToRemove && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 text-center shadow-2xl">
                        <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Remove Mentee?</h3>
                        <p className="text-slate-400 mb-6">
                            Are you sure you want to disconnect from <strong>{menteeToRemove.studentName}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setMenteeToRemove(null)} className="px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={() => handleRemoveMentee(menteeToRemove.studentId)} className="px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-lg shadow-rose-900/20">Confirm Removal</button>
                        </div>
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-md ${
                            toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                        }`}
                    >
                        {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <span className="font-medium text-sm">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MentorDashboard;