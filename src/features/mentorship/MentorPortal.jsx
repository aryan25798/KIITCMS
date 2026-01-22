import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import MentorCard from './MentorCard';
import Spinner from '../../components/ui/Spinner';
import { Video } from 'lucide-react';

const MeetingInfo = ({ meeting }) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl mb-8 text-center"
    >
        <h3 className="text-xl font-bold text-white mb-2">Upcoming Group Meeting</h3>
        <p className="text-green-200 font-semibold">{meeting.title}</p>
        <p className="text-slate-300">{new Date(meeting.dateTime).toLocaleString()}</p>
        <a 
            href={meeting.meetLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
        >
            <Video size={18} /> Join Meeting
        </a>
    </motion.div>
);

const MentorPortal = () => {
    const { user, onChat } = useOutletContext();
    const [mentors, setMentors] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connectedMentorId, setConnectedMentorId] = useState(null);
    const [scheduledMeeting, setScheduledMeeting] = useState(null);

    useEffect(() => {
        const qMentors = query(collection(db, 'mentors'), where('status', '==', 'approved'));
        const unsubMentors = onSnapshot(qMentors, (snapshot) => {
            setMentors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const qRequests = query(collection(db, 'mentorRequests'), where('studentId', '==', user.uid));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqs);
            const acceptedReq = reqs.find(r => r.status === 'accepted');
            if (acceptedReq) {
                setConnectedMentorId(acceptedReq.mentorId);
            } else {
                setConnectedMentorId(null);
            }
        });

        return () => {
            unsubMentors();
            unsubRequests();
        };
    }, [user.uid]);

    useEffect(() => {
        if (!connectedMentorId) {
            setScheduledMeeting(null);
            return;
        }
        const meetingRef = doc(db, 'meetings', connectedMentorId);
        const unsubMeeting = onSnapshot(meetingRef, (docSnap) => {
            if (docSnap.exists()) {
                setScheduledMeeting(docSnap.data());
            } else {
                setScheduledMeeting(null);
            }
        });
        return () => unsubMeeting();
    }, [connectedMentorId]);

    const hasAcceptedMentor = useMemo(() => requests.some(r => r.status === 'accepted'), [requests]);

    const getConnectionStatus = (mentorId) => {
        const request = requests.find(r => r.mentorId === mentorId);
        if (request) {
            return request.status === 'accepted' ? 'connected' : 'pending';
        }
        return 'none';
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Find a Mentor</h2>
                <p className="text-slate-400 mt-2">Connect with experienced professionals and alumni for guidance.</p>
            </div>
            
            {scheduledMeeting && <MeetingInfo meeting={scheduledMeeting} />}

            {mentors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {mentors.map(mentor => (
                            <MentorCard
                                key={mentor.id}
                                mentor={mentor}
                                user={user}
                                connectionStatus={getConnectionStatus(mentor.uid)}
                                onChat={onChat}
                                isConnectionDisabled={hasAcceptedMentor}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <p>No mentors are available at the moment. Please check back later.</p>
                </div>
            )}
        </div>
    );
};

export default MentorPortal;
