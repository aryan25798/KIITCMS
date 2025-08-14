import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase'; 
import Sidebar from '../components/layout/Sidebar';
import NotificationBell from '../components/layout/NotificationBell';
import MentorChatModal from '../features/mentorship/MentorChatModal';
import LostAndFoundChatModal from '../features/lostAndFound/LostAndFoundChatModal';
import MarketplaceChatModal from '../features/marketplace/MarketplaceChatModal';
import StudentChatWidget from '../features/chat/StudentChatWidget';
import ConfirmModal from '../components/ui/ConfirmModal'; // Import the new modal
import VirtualAssistantChatbot from '../features/chat/VirtualAssistantChatbot'; // Import the new chatbot
import { Menu, AlertTriangle, Loader2, Bot } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
// Import the new NewsPage component
import NewsPage from '../features/news/NewsPage';

const ThreeDBackground = () => {
    const ref = useRef();
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.02;
        }
    });
    return <Stars ref={ref} radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />;
};

const DashboardPage = () => {
    const { user, role, loading, handleLogout, mentorData, setMentorData } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isBotChatOpen, setIsBotChatOpen] = useState(false); // State for the AI bot chat modal
    const navigate = useNavigate();
    
    const [activeMentorChat, setActiveMentorChat] = useState(null);
    const [activeLostAndFoundChat, setActiveLostAndFoundChat] = useState(null);
    const [activeMarketplaceChat, setActiveMarketplaceChat] = useState(null);

    const [complaints, setComplaints] = useState([]);
    const [complaintsLoading, setComplaintsLoading] = useState(true);

    // New state for SOS modal
    const [sosModal, setSosModal] = useState({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: '',
      variant: 'default',
      isLoading: false
    });

    // States for draggable AI Help button
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 150, y: window.innerHeight - 200 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const isClickRef = useRef(true);

    const handlePanic = async () => { 
        // Step 1: Show initial warning modal
        setSosModal({
            isOpen: true,
            title: "Emergency Alert",
            message: "Are you sure you want to send an emergency alert? This will notify campus security and admins.",
            confirmText: "Send SOS",
            variant: "danger",
            onConfirm: () => {
                // Step 2: Proceed with location request and second confirmation
                setSosModal({
                    isOpen: true,
                    title: "Confirm Location Sharing",
                    message: "This action will share your live location with campus security and admins. Are you absolutely sure you want to proceed?",
                    confirmText: "Yes, Send Alert",
                    variant: "danger",
                    onConfirm: executePanic,
                    isLoading: false,
                });
            },
        });
    };

    const executePanic = async () => {
        setSosModal(prev => ({ ...prev, isLoading: true }));

        try {
            if (!auth.currentUser || !user) {
                setSosModal({
                    isOpen: true,
                    title: "Authentication Error",
                    message: "Authentication error. Please sign out and sign back in.",
                    onConfirm: null, // No confirm button, just a dismiss button
                    confirmText: "Close",
                    variant: "default",
                    isLoading: false,
                });
                return;
            }

            // Step 3: Get location
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
            });
            const { latitude, longitude } = position.coords;

            // Step 4: Call the function using fetch
            const token = await auth.currentUser.getIdToken();
            const functionUrl = 'https://us-central1-smart-cms-2b68a.cloudfunctions.net/sendEmergencyAlert';
            
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    latitude, 
                    longitude,
                    displayName: user.displayName,
                    email: user.email 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send alert.');
            }
            
            // Success
            setSosModal({
                isOpen: true,
                title: "Alert Sent",
                message: "Emergency alert sent successfully! Help is on the way. Stay safe!",
                onConfirm: null,
                confirmText: "Close",
                variant: "success",
                isLoading: false,
            });

        } catch (error) {
            console.error("Error during panic process:", error);
            let errorMessage = "Failed to send alert. Please try again.";

            if (error instanceof GeolocationPositionError) {
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "Location access was denied. Please enable location services in your browser settings to use this feature.";
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = "Could not get your location in time. Please try again or check your signal.";
                }
            } else {
                errorMessage = `Failed to send alert: ${error.message}`;
            }

            // Error modal
            setSosModal({
                isOpen: true,
                title: "Error Sending Alert",
                message: errorMessage,
                onConfirm: null,
                confirmText: "Close",
                variant: "danger",
                isLoading: false,
            });
        }
    };

    useEffect(() => {
        if (loading || !user) return; 
        if (role === 'mentor') {
            setComplaintsLoading(false);
            return;
        }

        const baseQuery = collection(db, 'complaints');
        let q;

        if (role === 'admin') {
            q = query(baseQuery);
        } else if (role === 'department') {
            const deptPrefix = user.email.split('@')[0];
            const deptMap = { it: 'IT Department', maintenance: 'Maintenance', hostel: 'Hostel Affairs', academics: 'Academics' };
            const departmentName = deptMap[deptPrefix] || 'Unassigned';
            q = query(baseQuery, where('assignedDept', '==', departmentName));
        } else {
            q = query(baseQuery, where('userId', '==', user.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedComplaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComplaints(fetchedComplaints);
            setComplaintsLoading(false);
        });

        return () => unsubscribe();
    }, [user, role, loading]); 

    // Handle drag events for the AI Help button
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            isClickRef.current = false; // It's a drag, not a click
            const newX = e.clientX - dragStartPos.current.x;
            const newY = e.clientY - dragStartPos.current.y;
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            isClickRef.current = false;
            const newX = e.touches[0].clientX - dragStartPos.current.x;
            const newY = e.touches[0].clientY - dragStartPos.current.y;
            setPosition({ x: newX, y: newY });
        };
        const handleTouchEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);

    const handleDragStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        isClickRef.current = true; // Assume it's a click until proven otherwise
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        dragStartPos.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
    };

    const handleButtonClick = () => {
        // Only open the chat if it was a click, not a drag
        if (isClickRef.current) {
            setIsBotChatOpen(true);
        }
    };

    const userName = !loading && user ? (user.displayName || user.email.split('@')[0]) : '...';

    const contextValue = { 
        user, 
        role, 
        mentorData, 
        setMentorData,
        complaints,
        complaintsLoading,
        onChat: setActiveMentorChat,
        setActiveMarketplaceChat, 
        setActiveLostAndFoundChat 
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <Loader2 className="animate-spin h-10 w-10" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950">
            <div className="absolute inset-0 -z-20">
                <Canvas>
                    <Suspense fallback={null}><ThreeDBackground /></Suspense>
                </Canvas>
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-slate-900/80 to-black/50" />

            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}
            
            {user && <Sidebar 
                user={user} 
                role={role} 
                onLogout={handleLogout} 
                isOpen={isMobileMenuOpen} 
                setIsOpen={setIsMobileMenuOpen} 
            />}

            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className="flex items-center justify-between p-4 sm:p-6 lg:p-8 sticky top-0 bg-slate-950/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-300">
                            <Menu size={28} />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-bold text-white">Welcome back, <span className="text-cyan-400">{userName}</span>!</h1>
                            <p className="text-slate-400 mt-1 text-sm sm:text-base">Here's the latest update on your campus.</p>
                        </div>
                    </div>
                    <div className="flex flex-row-reverse sm:flex-row items-center gap-4">
                        {user && <NotificationBell user={user} role={role} onNavigate={(path) => navigate(path)} />}
                        {role === 'student' && (
                            <button 
                                onClick={handlePanic} 
                                disabled={loading}
                                className="px-3 py-2 bg-red-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-red-700 animate-pulse disabled:bg-red-900 disabled:cursor-not-allowed disabled:animate-none"
                            >
                                <AlertTriangle size={18} />
                                <span className="hidden sm:inline">SOS</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-4 sm:p-6 lg:p-8">
                    {user ? <Outlet context={contextValue} /> : <div>Loading...</div>}
                </div>
            </main>

            {/* Draggable AI Help button */}
            {role === 'student' && (
                <div 
                    className="fixed z-[100] touch-none" 
                    style={{ left: position.x, top: position.y }}
                >
                    <button 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        onClick={handleButtonClick}
                        className={`bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    >
                        <Bot size={20} />
                        AI Help
                    </button>
                </div>
            )}

            {/* Existing Modals */}
            {activeMentorChat && <MentorChatModal user={user} chatWith={activeMentorChat} onClose={() => setActiveMentorChat(null)} role={role} />}
            {activeLostAndFoundChat && <LostAndFoundChatModal user={user} chatInfo={activeLostAndFoundChat} onClose={() => setActiveLostAndFoundChat(null)} />}
            {activeMarketplaceChat && <MarketplaceChatModal user={user} chatInfo={activeMarketplaceChat} onClose={() => setActiveMarketplaceChat(null)} />}

            {/* New SOS Modal */}
            <ConfirmModal
                isOpen={sosModal.isOpen}
                onClose={() => setSosModal({ ...sosModal, isOpen: false, onConfirm: null })}
                onConfirm={sosModal.onConfirm}
                title={sosModal.title}
                message={sosModal.message}
                confirmText={sosModal.confirmText}
                cancelText="Cancel"
                isLoading={sosModal.isLoading}
                variant={sosModal.variant}
            />
            
            {role === 'student' && <StudentChatWidget user={user} />}
            {role === 'student' && isBotChatOpen && <VirtualAssistantChatbot isOpen={isBotChatOpen} onClose={() => setIsBotChatOpen(false)} />}
        </div>
    );
};

export default DashboardPage;
