import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import Spinner from '../../components/ui/Spinner';
import { Calendar, Trash2 } from 'lucide-react';

const ScheduleMeeting = ({ user, mentees }) => {
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    const [title, setTitle] = useState('');
    const [meetLink, setMeetLink] = useState('');
    const [dateTime, setDateTime] = useState('');

    useEffect(() => {
        const fetchMeeting = async () => {
            const meetingRef = doc(db, 'meetings', user.uid);
            const docSnap = await getDoc(meetingRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMeeting(data);
                setTitle(data.title);
                setMeetLink(data.meetLink);
                // Format the date correctly for the datetime-local input
                const date = new Date(data.dateTime);
                const formattedDateTime = date.toISOString().slice(0, 16);
                setDateTime(formattedDateTime);
            }
            setLoading(false);
        };
        fetchMeeting();
    }, [user.uid]);

    const handleScheduleMeeting = async (e) => {
        e.preventDefault();
        if (!title || !meetLink || !dateTime) {
            alert("Please fill out all fields.");
            return;
        }

        setLoading(true);
        const meetingData = {
            title,
            meetLink,
            dateTime,
            mentorId: user.uid,
            mentorName: user.displayName,
            menteeIds: mentees.map(m => m.studentId),
        };

        try {
            await setDoc(doc(db, 'meetings', user.uid), meetingData);
            setMeeting(meetingData);
            setIsEditing(false);

            // Send notifications to all mentees
            const notificationPromises = mentees.map(mentee => 
                createNotification({
                    recipientId: mentee.studentId,
                    message: `Your mentor, ${user.displayName}, has scheduled a meeting: "${title}".`,
                    type: 'new_meeting'
                })
            );
            await Promise.all(notificationPromises);
            
            alert("Meeting scheduled successfully and mentees have been notified!");
        } catch (error) {
            console.error("Error scheduling meeting:", error);
            alert("Failed to schedule meeting.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelMeeting = async () => {
        if (!window.confirm("Are you sure you want to cancel this meeting? This will notify your mentees.")) return;
        
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'meetings', user.uid));
            
            const notificationPromises = mentees.map(mentee => 
                createNotification({
                    recipientId: mentee.studentId,
                    message: `Your mentor, ${user.displayName}, has canceled the meeting: "${meeting.title}".`,
                    type: 'meeting_canceled'
                })
            );
            await Promise.all(notificationPromises);

            setMeeting(null);
            setTitle('');
            setMeetLink('');
            setDateTime('');
            alert("Meeting canceled and mentees have been notified.");
        } catch (error) {
            console.error("Error canceling meeting:", error);
            alert("Failed to cancel meeting.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center"><Spinner /></div>;
    }

    if (meeting && !isEditing) {
        return (
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-4">
                <h3 className="text-xl font-bold text-white">Current Scheduled Meeting</h3>
                <p className="text-slate-300"><strong>Title:</strong> {meeting.title}</p>
                <p className="text-slate-300"><strong>Date & Time:</strong> {new Date(meeting.dateTime).toLocaleString()}</p>
                <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                    {meeting.meetLink}
                </a>
                <div className="flex gap-4 pt-4">
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700">Edit Meeting</button>
                    <button onClick={handleCancelMeeting} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 flex items-center gap-2"><Trash2 size={16}/> Cancel Meeting</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-6">
            <h3 className="text-xl font-bold text-white">{isEditing ? "Edit Meeting" : "Schedule a New Meeting"}</h3>
            <form onSubmit={handleScheduleMeeting} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-slate-400">Meeting Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Weekly Catch-up" className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">Google Meet Link</label>
                    <input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">Date and Time</label>
                    <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                </div>
                <div className="flex gap-4 pt-2">
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                        {loading ? <Spinner /> : <Calendar size={16} />}
                        {isEditing ? "Update Meeting" : "Schedule & Notify"}
                    </button>
                    {isEditing && (
                        <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700">Cancel Edit</button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ScheduleMeeting;
