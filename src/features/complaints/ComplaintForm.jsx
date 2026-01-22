import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { AI_HELPERS } from '../../services/ai';
import { createNotification } from '../../services/notifications';
import { EmailService } from '../../services/email';
import Spinner from '../../components/ui/Spinner';
import { z } from 'zod'; // ✅ ADDED: Zod for industry-grade validation
import {
    ShieldQuestion, FileUp, Send, Bot, User, Mic, Square, Paperclip, CheckCircle, AlertCircle, X
} from 'lucide-react';

// --- ✅ SECURITY: ZOD VALIDATION SCHEMA ---
// This acts as a firewall before data leaves the client.
const complaintSchema = z.object({
    name: z.string()
        .min(2, "Name must be at least 2 characters.")
        .max(50, "Name is too long (max 50 chars)."), // Cap length
    rollNo: z.string()
        .regex(/^[A-Za-z]+\/\d+\/\d+$/, "Invalid Roll No format (e.g., BTECH/1001/24)."),
    title: z.string()
        .min(5, "Title must be at least 5 characters.")
        .max(100, "Title is too long (max 100 chars)."), // Cap length
    description: z.string()
        .min(20, "Please provide a more detailed description (min 20 chars).")
        .max(2000, "Description is too long (max 2000 chars)."), // Prevent 10MB payloads
    isAnonymous: z.boolean()
});

const ComplaintForm = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    // Form State
    const [step, setStep] = useState('initial');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        name: user.displayName || '',
        rollNo: '',
        isAnonymous: false
    });
    const [attachment, setAttachment] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Process State
    const [chatHistory, setChatHistory] = useState([]);
    const [triageInput, setTriageInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcriptionStatus, setTranscriptionStatus] = useState('');
    const [submissionError, setSubmissionError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0); 

    // Refs
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user && user.displayName) {
            setFormData(prev => ({ ...prev, name: user.displayName }));
        }
    }, [user]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    // --- HANDLERS ---

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear specific error when user types
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleAudioToggle = () => {
        if (isRecording) {
            if(recognitionRef.current) recognitionRef.current.stop();
        } else {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setTranscriptionStatus('Speech recognition not supported.');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onstart = () => { setIsRecording(true); setTranscriptionStatus('Listening...'); };
            recognition.onend = () => { setIsRecording(false); setTranscriptionStatus(''); };
            recognition.onerror = (event) => { console.error('Speech recognition error:', event.error); setTranscriptionStatus('Recording error.'); setIsRecording(false); };
            recognition.onresult = (event) => {
                let final_transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final_transcript += event.results[i][0].transcript;
                    }
                }
                if (final_transcript) {
                    setFormData(prev => ({ ...prev, description: (prev.description ? prev.description + ' ' : '') + final_transcript }));
                }
            };
            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    // --- AI TRIAGE LOGIC ---

    const handleGetAIHelp = async () => {
        // ✅ ZOD CHECK: Validate only the description/title before hitting AI API
        const partialSchema = complaintSchema.pick({ title: true, description: true });
        const result = partialSchema.safeParse(formData);
        
        if (!result.success) {
            const errors = {};
            result.error.issues.forEach(issue => {
                errors[issue.path[0]] = issue.message;
            });
            setValidationErrors(errors);
            return;
        }

        setIsLoadingAI(true);
        const { title, description } = formData;
        const userMessage = { role: 'user', text: description };
        const initialHistory = [{ role: 'assistant', text: `Okay, let's try to solve this issue about "${title}". Here are some steps:` }];
        try {
            const aiResponse = await AI_HELPERS.getChatbotResponse(description, []);
            setChatHistory([...initialHistory, userMessage, { role: 'assistant', text: aiResponse }]);
            setStep('triage');
        } catch (error) {
            setChatHistory([...initialHistory, userMessage, { role: 'assistant', text: "I'm having trouble connecting to my AI services right now. You can proceed to file the complaint directly." }]);
            setStep('triage');
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleTriageChatSend = async () => {
        if (!triageInput.trim()) return;
        const userMessage = { role: 'user', text: triageInput };
        const newHistory = [...chatHistory, userMessage];
        setChatHistory(newHistory);
        setTriageInput('');
        setIsLoadingAI(true);
        try {
            const aiResponse = await AI_HELPERS.getChatbotResponse(triageInput, chatHistory);
            setChatHistory([...newHistory, { role: 'assistant', text: aiResponse }]);
        } catch (error) {
            setChatHistory([...newHistory, { role: 'assistant', text: "Sorry, I encountered an error. Please try again or submit the complaint." }]);
        } finally {
            setIsLoadingAI(false);
        }
    };

    // --- SUBMISSION LOGIC ---

    const handleFormalSubmit = async () => {
        // ✅ ZOD CHECK: Full validation before submission
        const result = complaintSchema.safeParse(formData);
        
        if (!result.success) {
            const errors = {};
            result.error.issues.forEach(issue => { errors[issue.path[0]] = issue.message; });
            setValidationErrors(errors);
            setSubmissionError("Please fix the errors highlighted above.");
            return; // STOP execution
        }

        setIsSubmitting(true);
        setSubmissionError('');
        setUploadProgress(0);

        try {
            let attachmentURL = '';

            // 2. Resumable Upload with Progress
            if (attachment) {
                // Size Check (e.g., 5MB limit) - Extra safety
                if (attachment.size > 5 * 1024 * 1024) {
                    throw new Error("Attachment size exceeds 5MB limit.");
                }

                const storageRef = ref(storage, `attachments/${Date.now()}_${attachment.name}`);
                const uploadTask = uploadBytesResumable(storageRef, attachment);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => {
                            console.error("Upload failed:", error);
                            reject(error);
                        },
                        async () => {
                            attachmentURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve();
                        }
                    );
                });
            }

            // 3. Prepare Data
            const fullDescription = `Initial Issue: ${formData.description}\n\n--- AI Triage Log ---\n${chatHistory.map(m => `${m.role}: ${m.text}`).join('\n')}`;
            
            // 4. AI Categorization (Resilient)
            let aiData = { category: 'General', priority: 'Medium', priorityLevel: 2, assignedDept: 'Unassigned' };
            try {
                aiData = await AI_HELPERS.getCategoryAndPriority(fullDescription);
            } catch (aiError) {
                console.warn("AI Analysis failed, defaulting.", aiError);
            }
            const { category, priority, priorityLevel, assignedDept } = aiData;

            // 5. Database Write
            const docRef = await addDoc(collection(db, 'complaints'), {
                title: formData.title,
                description: fullDescription,
                userId: user.uid,
                userName: formData.name,
                userEmail: user.email,
                userRollNo: formData.rollNo,
                isAnonymous: formData.isAnonymous,
                status: 'Pending',
                createdAt: serverTimestamp(),
                category, priority, priorityLevel, assignedDept, attachmentURL, isEscalated: false,
                rating: null, ratingComment: ''
            });

            // 6. Side Effects (Notifications/Email) - Non-Blocking
            if (assignedDept !== 'Unassigned') {
                createNotification({
                    recipientDept: assignedDept,
                    message: `New [${priority}] priority complaint '${formData.title}' has been assigned to your department.`,
                    complaintId: docRef.id,
                    type: 'new_complaint'
                }).catch(err => console.error("Notification failed", err));
            }

            const templateParams = {
                to_name: formData.name,
                complaint_title: formData.title,
                complaint_id: docRef.id,
                user_email: user.email
            };
            EmailService.sendNewComplaintEmail(templateParams).catch(err => console.error("Email failed", err));

            // Success
            setStep('submitted');

        } catch (error) {
            console.error("Critical failure:", error);
            setSubmissionError(error.message || "Submission failed. Please check your connection and try again.");
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    // --- RENDER HELPERS ---

    const renderError = (field) => validationErrors[field] && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {validationErrors[field]}
        </p>
    );

    if (step === 'submitted') {
        return (
            <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-xl shadow-lg text-center border border-slate-700/50">
                <CheckCircle className="w-20 h-20 mx-auto text-green-400 bg-green-500/10 rounded-full p-2" />
                <h2 className="text-3xl font-bold mt-4 text-white">Complaint Submitted!</h2>
                <p className="text-slate-300 mt-2">Your complaint has been logged. You can track its status in your dashboard.</p>
                {submissionError && <p className="text-yellow-500 text-xs mt-2">(Note: Notifications may have failed, but ticket is created)</p>}
                <button onClick={() => navigate('/portal/dashboard')} className="mt-8 px-8 py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-colors">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (step === 'triage') {
        return (
            <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-slate-700/50">
                <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-3"><Bot className="text-cyan-400"/> AI Troubleshooting</h2>
                <div className="h-80 bg-slate-900/70 rounded-lg p-4 overflow-y-auto border border-slate-700 mb-4 flex flex-col gap-4">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 max-w-[90%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                            <div className={`p-2 rounded-full ${msg.role === 'user' ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                                {msg.role === 'assistant' ? <Bot size={20} className="text-cyan-400" /> : <User size={20} className="text-blue-300" />}
                            </div>
                            <div className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500/30' : 'bg-slate-700/50'}`}>
                                <p className="text-sm whitespace-pre-wrap text-slate-200">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoadingAI && <div className="self-start flex items-center gap-3"><div className="bg-slate-700 p-2 rounded-full"><Bot size={20} className="text-cyan-400" /></div><div className="p-3 bg-slate-700/50 rounded-lg text-sm text-slate-400">AI is thinking...</div></div>}
                    <div ref={chatEndRef} />
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <input value={triageInput} onChange={(e) => setTriageInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleTriageChatSend()} placeholder="Reply to the AI..." className="flex-grow p-3 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                    <button onClick={handleTriageChatSend} disabled={isLoadingAI} className="p-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-cyan-400/50 transition-colors"><Send size={20}/></button>
                </div>
                
                {/* Progress Bar during Triage Submission */}
                {isSubmitting && attachment && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Uploading Attachment...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                )}

                <div className="text-center mt-6">
                    <p className="text-sm text-slate-400 mb-3">If the AI couldn't solve your issue, you can submit a formal complaint.</p>
                    <button onClick={handleFormalSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 transition-colors">
                        <FileUp size={18} /> {isSubmitting ? 'Submitting...' : 'Submit Formal Complaint'}
                    </button>
                    {submissionError && <p className="text-red-400 text-sm mt-4">{submissionError}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-slate-700/50">
            <h2 className="text-2xl font-bold mb-6 text-white">File a New Complaint</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleGetAIHelp(); }}>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={(e) => handleInputChange('name', e.target.value)} 
                            placeholder="Full Name" 
                            className={`w-full p-3 border rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${validationErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-cyan-500'}`}
                        />
                        {renderError('name')}
                    </div>
                    <div>
                        <input 
                            type="text" 
                            value={formData.rollNo} 
                            onChange={(e) => handleInputChange('rollNo', e.target.value)} 
                            placeholder="Roll No. (e.g. BTECH/1001/24)" 
                            className={`w-full p-3 border rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${validationErrors.rollNo ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-cyan-500'}`}
                        />
                        {renderError('rollNo')}
                    </div>
                </div>
                
                <div className="mb-4">
                    <input 
                        type="text" 
                        value={formData.title} 
                        onChange={(e) => handleInputChange('title', e.target.value)} 
                        placeholder="Complaint Title (e.g., Wi-Fi not working in Hostel B)" 
                        className={`w-full p-3 border rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${validationErrors.title ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-cyan-500'}`}
                    />
                    {renderError('title')}
                </div>

                <div className="mb-4 relative">
                    <textarea 
                        value={formData.description} 
                        onChange={(e) => handleInputChange('description', e.target.value)} 
                        placeholder="Describe your issue in detail..." 
                        className={`w-full p-3 border rounded-lg h-36 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${validationErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-cyan-500'}`}
                    />
                    {renderError('description')}
                    
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        {transcriptionStatus && <p className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{transcriptionStatus}</p>}
                        <button type="button" onClick={handleAudioToggle} className={`flex items-center justify-center w-10 h-10 rounded-full text-white transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-600 hover:bg-slate-500'}`}>
                            {isRecording ? <Square size={18} /> : <Mic size={18} />}
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <input type="file" ref={fileInputRef} onChange={(e) => setAttachment(e.target.files[0])} className="hidden" accept="image/*" />
                    
                    {attachment ? (
                        <div className="flex items-center justify-between p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                            <div className="flex items-center gap-2 text-slate-300 overflow-hidden">
                                <Paperclip size={18} />
                                <span className="truncate">{attachment.name}</span>
                                <span className="text-xs text-slate-500">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button type="button" onClick={() => { setAttachment(null); fileInputRef.current.value = ''; }} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => fileInputRef.current.click()} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700">
                            <Paperclip size={18} />
                            <span>Attach an Image (Optional)</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center mb-6">
                    <input id="anonymous" type="checkbox" checked={formData.isAnonymous} onChange={(e) => handleInputChange('isAnonymous', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 bg-slate-700" />
                    <label htmlFor="anonymous" className="ml-3 block text-sm text-slate-300">Submit Anonymously (your details will be hidden from admins)</label>
                </div>

                <button type="submit" disabled={isLoadingAI} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-shadow disabled:opacity-60">
                    {isLoadingAI ? <Spinner /> : <ShieldQuestion size={22} />}
                    {isLoadingAI ? 'Analyzing...' : 'Get AI Help First'}
                </button>
            </form>
        </div>
    );
};

export default ComplaintForm;