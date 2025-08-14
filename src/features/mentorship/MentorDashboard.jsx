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
import { MessageSquare, UserX } from 'lucide-react';

const MentorDashboard = () => {
    const { user, mentorData, setMentorData, onChat } = useOutletContext();
    
    const [requests, setRequests] = useState([]);
    const [leaveApps, setLeaveApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('requests');
    const [menteeToRemove, setMenteeToRemove] = useState(null);

    useEffect(() => {
        setLoading(true);

        const qRequests = query(collection(db, 'mentorRequests'), where('mentorId', '==', user.uid));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Error fetching mentor requests:", error));

        const qLeave = query(collection(db, 'leaveApplications'), where('mentorId', '==', user.uid));
        const unsubLeave = onSnapshot(qLeave, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            apps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setLeaveApps(apps);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching leave applications:", error);
            setLoading(false);
        });

        return () => {
            unsubRequests();
            unsubLeave();
        };
    }, [user.uid]);

    const handleRequestUpdate = async (id, status, studentId) => {
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
        
        await createNotification({
            recipientId: studentId,
            message: `Your mentorship request has been ${status}.`,
            type: 'mentor_response'
        });

        await batch.commit();
    };

    const handleLeaveUpdate = async (id, status, studentId) => {
        await updateDoc(doc(db, 'leaveApplications', id), { status });
        await createNotification({
            recipientId: studentId,
            message: `Your leave application has been ${status} by your mentor.`,
            leaveId: id,
            type: 'leave_response'
        });
    };
    
    const handleRemoveMentee = async (studentId) => {
        if (!studentId) return;
        try {
            await deleteDoc(doc(db, 'studentConnections', studentId));

            const q = query(collection(db, 'mentorRequests'), where('studentId', '==', studentId), where('mentorId', '==', user.uid), where('status', '==', 'accepted'));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            alert('Mentee removed successfully.');
        } catch (error) {
            console.error("Error removing mentee: ", error);
            alert('Failed to remove mentee.');
        } finally {
            setMenteeToRemove(null);
        }
    };

    const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
    const acceptedRequests = useMemo(() => requests.filter(r => r.status === 'accepted'), [requests]);

    return (
        <div className="space-y-8">
            <div className="flex border-b border-slate-700 flex-wrap">
                <button onClick={() => setActiveView('requests')} className={`px-4 py-2 font-semibold ${activeView === 'requests' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>Mentee Requests ({pendingRequests.length})</button>
                <button onClick={() => setActiveView('mentees')} className={`px-4 py-2 font-semibold ${activeView === 'mentees' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>My Mentees ({acceptedRequests.length})</button>
                <button onClick={() => setActiveView('leave')} className={`px-4 py-2 font-semibold ${activeView === 'leave' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>Leave Requests ({leaveApps.filter(a => a.status === 'Pending').length})</button>
                <button onClick={() => setActiveView('schedule')} className={`px-4 py-2 font-semibold ${activeView === 'schedule' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>Schedule Meeting</button>
                <button onClick={() => setActiveView('profile')} className={`px-4 py-2 font-semibold ${activeView === 'profile' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>My Profile</button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeView}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeView === 'requests' && (
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4">Incoming Mentorship Requests</h3>
                            {loading ? <div className="flex justify-center"><Spinner /></div> : pendingRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <p className="font-bold text-white">{req.studentName}</p>
                                                <p className="text-sm text-slate-400">{req.studentEmail}</p>
                                                <p className="text-sm text-slate-300 mt-2">"{req.purpose}"</p>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button onClick={() => handleRequestUpdate(req.id, 'accepted', req.studentId)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Accept</button>
                                                <button onClick={() => handleRequestUpdate(req.id, 'rejected', req.studentId)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-slate-400">No new requests.</p>}
                        </div>
                    )}
                    {activeView === 'profile' && <MentorProfileManagement user={user} mentorData={mentorData} onUpdate={setMentorData} />}
                    {activeView === 'mentees' && (
                         <div>
                            <h3 className="text-xl font-bold text-white mb-4">Your Mentees</h3>
                            {loading ? <div className="flex justify-center"><Spinner /></div> : acceptedRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {acceptedRequests.map(req => (
                                        <div key={req.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex justify-between items-center flex-wrap gap-4">
                                            <div>
                                                <p className="font-bold text-white">{req.studentName}</p>
                                                <p className="text-sm text-slate-400">{req.studentEmail}</p>
                                                <p className="text-sm text-slate-300 mt-2">Purpose: "{req.purpose}"</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => onChat({ uid: req.studentId, name: req.studentName })} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600">
                                                    <MessageSquare size={18} /> Chat
                                                </button>
                                                <button onClick={() => setMenteeToRemove(req)} className="flex items-center gap-2 px-4 py-2 bg-red-600/80 text-white font-semibold rounded-lg hover:bg-red-700">
                                                    <UserX size={18} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-slate-400">You have not accepted any mentees yet.</p>}
                        </div>
                    )}
                    {activeView === 'leave' && (
                         <div>
                            <h3 className="text-xl font-bold text-white mb-4">Mentee Leave Requests History</h3>
                            {loading ? <div className="flex justify-center"><Spinner /></div> : leaveApps.length > 0 ? (
                                <div className="space-y-4">
                                    {leaveApps.map(app => (
                                        <div key={app.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                                            <div className="flex justify-between items-start flex-wrap gap-2">
                                                <div>
                                                    <p className="font-bold text-white">{app.userName}</p>
                                                    <p className="text-sm text-slate-400">Reason: {app.reason}</p>
                                                    <p className="text-sm text-slate-400">Dates: {app.fromDate} to {app.toDate}</p>
                                                </div>
                                                <StatusPill status={app.status} />
                                            </div>
                                            {app.status === 'Pending' && (
                                                <div className="flex gap-2 mt-4">
                                                    <button onClick={() => handleLeaveUpdate(app.id, 'Approved', app.userId)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Approve</button>
                                                    <button onClick={() => handleLeaveUpdate(app.id, 'Rejected', app.userId)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Reject</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-slate-400">No leave applications from your mentees.</p>}
                        </div>
                    )}
                    {activeView === 'schedule' && <ScheduleMeeting user={user} mentees={acceptedRequests} />}
                </motion.div>
            </AnimatePresence>
            
            {menteeToRemove && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 text-center"
                    >
                        <h3 className="text-xl font-bold text-white">Confirm Removal</h3>
                        <p className="text-slate-400 mt-2">
                            Are you sure you want to remove <strong className="text-white">{menteeToRemove.studentName}</strong> as your mentee?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-4 mt-6 justify-center">
                            <button
                                onClick={() => handleRemoveMentee(menteeToRemove.studentId)}
                                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setMenteeToRemove(null)}
                                className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default MentorDashboard;
