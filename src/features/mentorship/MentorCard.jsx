import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import { Link as LinkIcon, MessageSquare, Clock, Send } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const MentorCard = ({ mentor, user, connectionStatus, onChat, isConnectionDisabled }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [purpose, setPurpose] = useState('');
    const [showPurposeInput, setShowPurposeInput] = useState(false);

    const handleConnect = async () => {
        if (!purpose.trim()) {
            alert("Please specify your purpose for connecting.");
            return;
        }
        setIsConnecting(true);
        try {
            await addDoc(collection(db, "mentorRequests"), {
                mentorId: mentor.uid,
                mentorName: mentor.name,
                studentId: user.uid,
                studentName: user.displayName || user.email,
                studentEmail: user.email,
                purpose: purpose,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            await createNotification({
                recipientId: mentor.uid,
                message: `You have a new mentorship request from ${user.displayName || user.email}.`,
                type: 'mentor_request'
            });
            setShowPurposeInput(false);
            alert("Your request has been sent to the mentor!");
        } catch (error) {
            console.error("Error sending mentor request:", error);
            alert("Failed to send request. Please try again.");
        } finally {
            setIsConnecting(false);
        }
    };

    const renderButton = () => {
        if (isConnectionDisabled && connectionStatus !== 'connected') {
            return (
                <button disabled className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-400 font-semibold rounded-lg cursor-not-allowed">
                    <LinkIcon size={18} /> One Mentor Limit
                </button>
            );
        }

        switch (connectionStatus) {
            case 'connected':
                return (
                    <button onClick={() => onChat(mentor)} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                        <MessageSquare size={18} /> Chat Now
                    </button>
                );
            case 'pending':
                return (
                    <button disabled className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 font-semibold rounded-lg cursor-not-allowed">
                        <Clock size={18} /> Request Sent
                    </button>
                );
            default:
                return (
                    <>
                        {!showPurposeInput ? (
                            <button onClick={() => setShowPurposeInput(true)} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-colors">
                                <LinkIcon size={18} /> Connect
                            </button>
                        ) : (
                            <div className="mt-4 w-full space-y-2">
                                <textarea
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    placeholder="What do you need help with?"
                                    className="w-full p-2 border border-slate-600 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 text-sm h-20"
                                />
                                <button onClick={handleConnect} disabled={isConnecting} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                                    {isConnecting ? <Spinner /> : <Send size={18} />}
                                    {isConnecting ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        )}
                    </>
                );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex flex-col items-center text-center"
        >
            <img
                src={mentor.profilePicture || `https://placehold.co/100x100/0f172a/94a3b8?text=${mentor.name.charAt(0)}`}
                alt={mentor.name}
                className="w-24 h-24 rounded-full mb-4 border-4 border-slate-700"
            />
            <h3 className="text-xl font-bold text-white">{mentor.name}</h3>
            <p className="text-sm text-green-400 mb-2">{mentor.email}</p>
            <div className="flex flex-wrap justify-center gap-2 my-2">
                {mentor.expertise?.map(skill => (
                    <span key={skill} className="px-2 py-1 text-xs bg-green-500/10 text-green-300 rounded-full">{skill}</span>
                ))}
            </div>
            <p className="text-slate-400 text-sm mt-2 flex-grow min-h-[60px]">{mentor.bio}</p>
            {renderButton()}
        </motion.div>
    );
};

export default MentorCard;