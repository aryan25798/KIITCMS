import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import StatusPill from '../../components/ui/StatusPill';

const LeaveManagement = () => {
    const { role, user } = useOutletContext();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!role) return;

        const baseQuery = collection(db, 'leaveApplications');
        let q;

        if (role === 'admin') {
            q = query(baseQuery);
        } else { // Assumes department is 'Hostel Affairs' based on sidebar logic
            q = query(baseQuery, where('assignedDept', '==', 'Hostel Affairs'));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            apps.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setApplications(apps);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching leave applications:", error);
            setLoading(false);
        });
        return unsubscribe;
    }, [role]);

    const handleUpdateStatus = async (id, status) => {
        const appRef = doc(db, 'leaveApplications', id);
        await updateDoc(appRef, { status });
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
            <h2 className="text-2xl font-bold text-white mb-4">Hostel Leave Management</h2>
            {loading ? <div className="flex justify-center"><Spinner /></div> : applications.length > 0 ? (
                <div className="space-y-4">
                    {applications.map(app => (
                        <div key={app.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                           <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-white">{app.userName}</p>
                                    <p className="text-sm text-slate-400">Reason: {app.reason}</p>
                                    <p className="text-sm text-slate-400">Dates: {app.fromDate} to {app.toDate}</p>
                                </div>
                                <StatusPill status={app.status} />
                            </div>
                            {app.status === 'Approved' && role === 'admin' && (
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => handleUpdateStatus(app.id, 'Approved')} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Approve</button>
                                    <button onClick={() => handleUpdateStatus(app.id, 'Rejected')} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Reject</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : <p className="text-slate-400">No leave applications found.</p>}
        </div>
    );
};

export default LeaveManagement;