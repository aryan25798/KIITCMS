import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import Spinner from '../../components/ui/Spinner';
import StatusPill from '../../components/ui/StatusPill';
import { ArrowLeft } from 'lucide-react';

const HostelLeavePortal = () => {
    const { user } = useOutletContext();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState('');
    const [hasMentor, setHasMentor] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [showMentorSelection, setShowMentorSelection] = useState(false);
    const [mentors, setMentors] = useState([]);
    const [loadingMentors, setLoadingMentors] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [purpose, setPurpose] = useState('Guidance for hostel leave application.');
    const [isSendingRequest, setIsSendingRequest] = useState(false);

    useEffect(() => {
        if (!user) return;

        const connectionRef = doc(db, 'studentConnections', user.uid);
        const unsubConnection = onSnapshot(connectionRef, (doc) => {
            setHasMentor(doc.exists());
        });

        const requestsQuery = query(collection(db, 'mentorRequests'), where('studentId', '==', user.uid), where('status', '==', 'pending'));
        const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
            setHasPendingRequest(!snapshot.empty);
        });
        
        const q = query(collection(db, 'leaveApplications'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            apps.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setApplications(apps);
            setLoading(false);
        });

        return () => {
            unsubConnection();
            unsubRequests();
            unsubscribe();
        };
    }, [user]);

    const handleAttemptSubmit = async (e) => {
        e.preventDefault();
        setNotification('');

        if (hasMentor) {
            await handleSubmitLeave();
        } else if (hasPendingRequest) {
            setNotification("Your mentor connection request is still pending. Please wait for approval before applying for leave.");
        } else {
            setLoadingMentors(true);
            const qMentors = query(collection(db, 'mentors'), where('status', '==', 'approved'));
            const mentorSnapshot = await getDocs(qMentors);
            setMentors(mentorSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setShowMentorSelection(true);
            setLoadingMentors(false);
        }
    };

    const handleSubmitLeave = async () => {
        if (!fromDate || !toDate || !reason) {
            setNotification("Please fill all fields.");
            return;
        }
        setIsSubmitting(true);
        try {
            const connectionRef = doc(db, 'studentConnections', user.uid);
            const connectionSnap = await getDoc(connectionRef);
            const mentorId = connectionSnap.exists() ? connectionSnap.data().mentorId : null;

            if (!mentorId) {
                setNotification("Error: Mentor connection not found. Please reconnect with a mentor.");
                setIsSubmitting(false);
                return;
            }

            const docRef = await addDoc(collection(db, 'leaveApplications'), {
                userId: user.uid,
                userName: user.displayName || user.email,
                mentorId: mentorId,
                fromDate,
                toDate,
                reason,
                status: 'Pending',
                assignedDept: 'Hostel Affairs',
                createdAt: serverTimestamp()
            });

            await createNotification({
                recipientId: mentorId,
                message: `${user.displayName || user.email} has submitted a leave application for your approval.`,
                leaveId: docRef.id,
                type: 'leave_request'
            });

            setFromDate('');
            setToDate('');
            setReason('');
            setNotification('Leave application submitted successfully!');
        } catch (error) {
            console.error("Error submitting leave application:", error);
            setNotification("Failed to submit application. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSendMentorRequest = async () => {
        if (!selectedMentor || !purpose.trim()) {
            setNotification("Please select a mentor and provide a purpose.");
            return;
        }
        setIsSendingRequest(true);
        try {
            await addDoc(collection(db, "mentorRequests"), {
                mentorId: selectedMentor.uid,
                mentorName: selectedMentor.name,
                studentId: user.uid,
                studentName: user.displayName || user.email,
                studentEmail: user.email,
                purpose: purpose,
                status: "pending",
                createdAt: serverTimestamp(),
            });

            await createNotification({
                recipientId: selectedMentor.uid,
                message: `You have a new mentorship request from ${user.displayName || user.email}.`,
                type: 'mentor_request'
            });
            setNotification("Your request has been sent! You will be notified when the mentor responds. You can then return to apply for leave.");
            setShowMentorSelection(false);
        } catch (error) {
            console.error("Error sending mentor request:", error);
            setNotification("Failed to send request.");
        } finally {
            setIsSendingRequest(false);
        }
    };

    if (showMentorSelection) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <button onClick={() => setShowMentorSelection(false)} className="flex items-center gap-2 text-sm text-cyan-400 mb-4"><ArrowLeft size={16}/> Back to Form</button>
                <h2 className="text-2xl font-bold text-white mb-2">Connect with a Mentor</h2>
                <p className="text-slate-400 mb-6">A mentor's approval is required for leave applications. Please select a mentor to send a connection request.</p>
                {notification && <p className="mb-4 text-yellow-300 bg-yellow-500/10 p-3 rounded-lg">{notification}</p>}
                
                {loadingMentors ? <Spinner /> : (
                    <div className="space-y-4">
                        <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                            {mentors.map(mentor => (
                                <div key={mentor.id} onClick={() => setSelectedMentor(mentor)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedMentor?.id === mentor.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800'}`}>
                                    <p className="font-bold text-white">{mentor.name}</p>
                                    <p className="text-xs text-slate-400">{mentor.expertise?.join(', ')}</p>
                                </div>
                            ))}
                        </div>
                        <textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Purpose for connecting..." className="w-full mt-1 p-2 h-24 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                        <button onClick={handleSendMentorRequest} disabled={isSendingRequest || !selectedMentor} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSendingRequest ? 'Sending...' : 'Send Connection Request'}
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">Apply for Hostel Leave</h2>
                {notification && <p className="mb-4 text-yellow-300 bg-yellow-500/10 p-3 rounded-lg">{notification}</p>}
                <form onSubmit={handleAttemptSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fromDate" className="text-sm font-medium text-slate-400">From Date</label>
                            <input 
                                id="fromDate" 
                                type="text" 
                                placeholder="dd-mm-yyyy"
                                onFocus={(e) => e.target.type = 'date'}
                                onBlur={(e) => {if(!e.target.value) e.target.type='text'}}
                                value={fromDate} 
                                onChange={e => setFromDate(e.target.value)} 
                                className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" 
                            />
                        </div>
                        <div>
                            <label htmlFor="toDate" className="text-sm font-medium text-slate-400">To Date</label>
                            <input 
                                id="toDate" 
                                type="text" 
                                placeholder="dd-mm-yyyy"
                                onFocus={(e) => e.target.type = 'date'}
                                onBlur={(e) => {if(!e.target.value) e.target.type='text'}}
                                value={toDate} 
                                onChange={e => setToDate(e.target.value)} 
                                className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" 
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="reason" className="text-sm font-medium text-slate-400">Reason</label>
                        <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} className="w-full mt-1 p-2 h-24 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 disabled:opacity-50">
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                </form>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <h3 className="text-xl font-bold text-white mb-4">Your Leave History</h3>
                {loading ? <Spinner /> : applications.length > 0 ? (
                    <div className="space-y-4">
                        {applications.map(app => (
                            <div key={app.id} className="p-4 bg-slate-900/50 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{app.reason}</p>
                                    <p className="text-sm text-slate-400">{app.fromDate} to {app.toDate}</p>
                                </div>
                                <StatusPill status={app.status} />
                            </div>
                        ))}
                    </div>
                ) : <p className="text-slate-400">You have no leave applications.</p>}
            </div>
        </div>
    );
};

export default HostelLeavePortal;