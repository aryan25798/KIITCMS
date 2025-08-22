import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'; // Import deleteDoc
import { db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import { AI_HELPERS } from '../../services/ai';
import { emailjsConfig } from '../../config';
import emailjs from '@emailjs/browser';
import Spinner from '../../components/ui/Spinner';
import StatusPill from '../../components/ui/StatusPill';
import ChatInterface from './ChatInterface';
import AnimatedProgressTracker from './AnimatedProgressTracker';
import { ChevronDown, ChevronsUp, ImageIcon, Star, Download, Bot, Edit, Trash2 } from 'lucide-react';

const ComplaintCard = ({ complaint, role, user, onUpdate, onSelect, isSelected, onDelete }) => { // Add onDelete prop
    const [expanded, setExpanded] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [internalNote, setInternalNote] = useState(complaint.internalNote || '');
    const [assignedDept, setAssignedDept] = useState(complaint.assignedDept || 'Unassigned');
    const [rating, setRating] = useState(complaint.rating || 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingComment, setRatingComment] = useState(complaint.ratingComment || '');
    const [newMessage, setNewMessage] = useState('');

    const isAdmin = role !== 'student';
    const isSuperAdmin = role === 'admin';
    const complaintRef = useRef(null);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        const authorName = isAdmin ? `${role.charAt(0).toUpperCase() + role.slice(1)} Admin` : 'Student';

        await addDoc(collection(db, 'complaints', complaint.id, 'replies'), {
            text: newMessage,
            author: authorName,
            authorId: user.uid,
            timestamp: serverTimestamp(),
        });

        const newStatus = isAdmin ? 'Responded' : 'User Responded';
        await updateDoc(doc(db, 'complaints', complaint.id), {
            status: newStatus,
        });

        if (isAdmin) {
            await createNotification({
                recipientId: complaint.userId,
                message: `${authorName} replied to your complaint: "${complaint.title}"`,
                complaintId: complaint.id,
                type: 'complaint_reply'
            });
        }
        
        onUpdate({ ...complaint, status: newStatus });
        setNewMessage('');
    };

    const isReopenable = useMemo(() => {
        if (!complaint.resolvedAt?.seconds || role !== 'student' || complaint.status !== 'Resolved') {
            return false;
        }
        const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
        return complaint.resolvedAt.seconds > sevenDaysAgo;
    }, [complaint, role]);

    const isEscalatable = useMemo(() => {
        if (!complaint.createdAt?.seconds || role !== 'student' || complaint.status === 'Resolved' || complaint.isEscalated) {
            return false;
        }
        const threeDaysAgo = Date.now() / 1000 - 3 * 24 * 60 * 60;
        return complaint.createdAt.seconds < threeDaysAgo;
    }, [complaint, role]);

    const handleAdminUpdate = async (field, value) => {
        const oldStatus = complaint.status;
        const updateData = { [field]: value };
        if (field === 'status' && value === 'Resolved') {
            updateData.resolvedAt = serverTimestamp();
            
            const templateParams = {
                to_name: complaint.userName,
                complaint_title: complaint.title,
                complaint_id: complaint.id,
                user_email: complaint.userEmail
            };

            emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateIdResolved, templateParams, emailjsConfig.publicKey)
                .then((response) => console.log('SUCCESS! Complaint resolved email sent.', response.status, response.text),
                      (err) => console.error('FAILED to send resolved email...', err));
        }
        await updateDoc(doc(db, 'complaints', complaint.id), updateData);

        if (field === 'status' && value !== oldStatus) {
            await createNotification({
                recipientId: complaint.userId,
                message: `The status of your complaint "${complaint.title}" was updated to ${value}.`,
                complaintId: complaint.id,
                type: 'status_change'
            });
        }
        onUpdate({ ...complaint, [field]: value });
    };

    // New function to handle complaint deletion
    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to permanently delete this complaint? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'complaints', complaint.id));
                // Notify the parent component to remove the card from the UI
                if (onDelete) {
                    onDelete(complaint.id);
                }
            } catch (error) {
                console.error("Error deleting complaint: ", error);
                // You could add an error notification for the user here
            }
        }
    };

    const handleReopen = async () => {
        await handleAdminUpdate('status', 'Re-opened');
    };

    const handleEscalate = async () => {
        if (!isEscalatable) return;
        await updateDoc(doc(db, 'complaints', complaint.id), { isEscalated: true });
        await createNotification({
            recipientRole: 'admin',
            message: `Complaint "${complaint.title}" has been escalated by the student.`,
            complaintId: complaint.id,
            type: 'escalation'
        });
        onUpdate({ ...complaint, isEscalated: true });
    };

    const handleGetSuggestions = async () => {
        setLoadingSuggestions(true);
        const replySuggestions = await AI_HELPERS.getAdminReplySuggestion(complaint.description);
        setSuggestions(replySuggestions);
        setLoadingSuggestions(false);
    };

    const handleRatingSubmit = async () => {
        await updateDoc(doc(db, 'complaints', complaint.id), {
            rating: rating,
            ratingComment: ratingComment
        });
        onUpdate({ ...complaint, rating, ratingComment });
    };

    const exportToPDF = () => {
        if (window.jspdf && window.html2canvas) {
            const { jsPDF } = window.jspdf;
            const input = complaintRef.current;
            window.html2canvas(input, { scale: 2, backgroundColor: '#1e293b' }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                const width = pdfWidth - 20;
                const height = width / ratio;
                pdf.addImage(imgData, 'PNG', 10, 10, width, height);
                pdf.save(`complaint-${complaint.id}.pdf`);
            });
        } else {
            console.error("PDF generation libraries not loaded yet.");
        }
    };

    const getPriorityPill = (priority) => {
        const colors = {
            'High': 'bg-red-500/20 text-red-300 border border-red-500/30',
            'Medium': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
            'Low': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
        };
        return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors[priority]}`}>{priority} Priority</span>;
    };

    const formattedDate = complaint.createdAt?.seconds
        ? new Date(complaint.createdAt.seconds * 1000).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })
        : 'Date not available';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, type: "spring" }}
            ref={complaintRef} className={`rounded-xl overflow-hidden bg-slate-800/50 backdrop-blur-xl shadow-lg transition-all duration-300 border ${complaint.isEscalated ? 'border-red-500/50' : 'border-slate-700/50'}`}>
            <div className="flex items-start p-5">
                {isAdmin && (
                    <div className="flex-shrink-0 mr-4 pt-1">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect(complaint.id)}
                            className="h-5 w-5 rounded border-slate-600 text-cyan-500 bg-slate-700 focus:ring-cyan-500"
                        />
                    </div>
                )}
                <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {complaint.isEscalated && <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300"><ChevronsUp size={14}/> Escalated</span>}
                            {getPriorityPill(complaint.priority)}
                            <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">{complaint.category}</span>
                        </div>
                        <span className="font-bold text-lg text-white block truncate">{complaint.title}</span>
                        <span className="text-xs text-slate-400 mt-1 block">{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-4 pl-4">
                        <StatusPill status={complaint.status} />
                        <ChevronDown className={`transition-transform duration-300 text-slate-400 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                </button>
            </div>
            <AnimatePresence>
            {expanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <div className="p-5 border-t border-slate-700/50">
                        {!isAdmin && (
                            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
                                <h4 className="font-semibold text-slate-300 mb-2 text-center">Complaint Progress</h4>
                                <AnimatedProgressTracker status={complaint.status} />
                            </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                {isAdmin && !complaint.isAnonymous && (
                                    <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
                                        <h4 className="font-semibold text-slate-300 mb-2">Student Details:</h4>
                                        <p className="text-sm text-slate-400"><strong>Name:</strong> {complaint.userName}</p>
                                        <p className="text-sm text-slate-400"><strong>Roll No:</strong> {complaint.userRollNo}</p>
                                        <p className="text-sm text-slate-400"><strong>Email:</strong> {complaint.userEmail}</p>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <h4 className="font-semibold text-slate-300 mb-2">Full Complaint Details:</h4>
                                    <p className="text-slate-300 text-sm bg-slate-900/50 p-3 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto">{complaint.description}</p>
                                </div>
                                {complaint.attachmentURL && (
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-slate-300 mb-2">Attachment:</h4>
                                        <a href={complaint.attachmentURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                                            <ImageIcon size={18} /> View Attached Image
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div>
                                {isAdmin && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-3 bg-slate-900/50 rounded-lg">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor={`status-select-${complaint.id}`} className="font-semibold text-slate-300 text-sm">Status:</label>
                                            <select id={`status-select-${complaint.id}`} value={complaint.status} onChange={(e) => handleAdminUpdate('status', e.target.value)} className="p-2 border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                                <option>Pending</option><option>In Progress</option><option>Responded</option><option>User Responded</option><option>Resolved</option><option>Re-opened</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor={`assign-select-${complaint.id}`} className="font-semibold text-slate-300 text-sm">Assign to:</label>
                                            <select id={`assign-select-${complaint.id}`} value={assignedDept} disabled={!isSuperAdmin} onChange={(e) => { setAssignedDept(e.target.value); handleAdminUpdate('assignedDept', e.target.value); }} className="p-2 border border-slate-700 rounded-lg bg-slate-800 text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500">
                                                <option>Unassigned</option><option>Maintenance</option><option>IT Department</option><option>Academics</option><option>Hostel Affairs</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <ChatInterface
                                    complaint={complaint}
                                    user={user}
                                    role={role}
                                    onUpdate={onUpdate}
                                    newMessage={newMessage}
                                    setNewMessage={setNewMessage}
                                    handleSendMessage={handleSendMessage}
                                />
                            </div>
                        </div>
                        {complaint.status === 'Resolved' && role === 'student' && !complaint.rating && (
                            <div className="mt-6 pt-4 border-t border-slate-700/50">
                                <h4 className="font-semibold text-slate-300 mb-2">Rate your satisfaction:</h4>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            className={`cursor-pointer transition-colors ${ (hoverRating || rating) >= star ? 'text-yellow-400' : 'text-slate-600'}`}
                                            fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                        />
                                    ))}
                                </div>
                                <textarea id={`rating-comment-${complaint.id}`} value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Add an optional comment..." className="w-full mt-2 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
                                <button onClick={handleRatingSubmit} className="mt-2 px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600">Submit Rating</button>
                            </div>
                        )}
                        {isReopenable && (
                            <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
                                <p className="text-sm text-slate-400 mb-2">Not satisfied with the resolution? You can re-open this ticket.</p>
                                <button onClick={handleReopen} className="flex items-center justify-center gap-2 w-full sm:w-auto mx-auto px-4 py-2 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition-colors">
                                    Re-open Complaint
                                </button>
                            </div>
                        )}
                        {isEscalatable && (
                            <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
                                <p className="text-sm text-slate-400 mb-2">This issue has been pending for a while. You can escalate it to the Super Admin.</p>
                                <button onClick={handleEscalate} className="flex items-center justify-center gap-2 w-full sm:w-auto mx-auto px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                                    <ChevronsUp size={18} /> Escalate Complaint
                                </button>
                            </div>
                        )}
                        
                        {/* --- MODIFIED SECTION: Action Buttons Footer --- */}
                        <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center flex-wrap gap-4">
                            <div>
                                {(role === 'student' || isSuperAdmin) && (
                                    <button onClick={handleDelete} className="flex items-center gap-2 text-sm text-red-500 font-semibold hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                        Delete Complaint
                                    </button>
                                )}
                            </div>
                            <button onClick={exportToPDF} className="flex items-center gap-2 text-sm text-cyan-400 font-semibold hover:text-cyan-300">
                                <Download size={16} />
                                Export to PDF
                            </button>
                        </div>
                        {/* --- END MODIFIED SECTION --- */}

                        {isAdmin && (
                            <div className="mt-6 pt-4 border-t border-slate-700/50">
                                <h4 className="font-semibold text-slate-300 mb-2">Admin Tools:</h4>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor={`internal-notes-${complaint.id}`} className="text-sm font-medium text-slate-400">Internal Notes (Admin only)</label>
                                        <textarea id={`internal-notes-${complaint.id}`} value={internalNote} onChange={e => setInternalNote(e.target.value)} onBlur={() => handleAdminUpdate('internalNote', internalNote)} placeholder="Add private notes here..." className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </div>
                                    <div>
                                        <button onClick={handleGetSuggestions} disabled={loadingSuggestions} className="flex items-center gap-2 text-sm text-cyan-400 font-semibold hover:text-cyan-300 mb-2">
                                            {loadingSuggestions ? <Spinner color="border-cyan-400" /> : <Bot size={16}/>}
                                            <span>{loadingSuggestions ? 'Generating...' : 'Get AI Reply Suggestions'}</span>
                                        </button>
                                        {suggestions.length > 0 && (
                                            <div className="space-y-2">
                                                {suggestions.map((s, i) => (
                                                    <div key={i} onClick={() => setNewMessage(s)} className="p-2 bg-slate-700/50 rounded-lg text-sm text-slate-300 cursor-pointer hover:bg-slate-700">{s}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ComplaintCard;