import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import Spinner from '../../components/ui/Spinner';
import { UserCheck, UserX } from 'lucide-react';

const MentorApproval = () => {
    const [pendingMentors, setPendingMentors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'mentors'), where('status', '==', 'pending'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingMentors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleApproval = async (id, newStatus) => {
        const mentorRef = doc(db, 'mentors', id);
        await updateDoc(mentorRef, { status: newStatus });
        await createNotification({
            recipientId: id,
            message: `Your mentor application has been ${newStatus}.`,
            type: 'mentor_approval_response'
        });
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
            <h2 className="text-2xl font-bold text-white mb-4">Mentor Registration Approvals</h2>
            {loading ? <div className="flex justify-center"><Spinner /></div> : pendingMentors.length > 0 ? (
                <div className="space-y-4">
                    {pendingMentors.map(mentor => (
                        <div key={mentor.id} className="p-4 bg-slate-900/50 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="font-bold text-white">{mentor.name}</p>
                                <p className="text-sm text-slate-400">{mentor.email}</p>
                            </div>
                            <div className="flex gap-4 flex-shrink-0">
                                <button onClick={() => handleApproval(mentor.id, 'approved')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"><UserCheck size={18}/> Approve</button>
                                <button onClick={() => handleApproval(mentor.id, 'rejected')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"><UserX size={18}/> Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-slate-400">There are no pending mentor applications.</p>
            )}
        </div>
    );
};

export default MentorApproval;