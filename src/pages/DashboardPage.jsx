import React, { useState, useMemo, Suspense, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../services/firebase';

// Components
import Sidebar from '../components/layout/Sidebar';
import NotificationBell from '../components/layout/NotificationBell';
import ConfirmModal from '../components/ui/ConfirmModal';
import FloatingBotButton from '../components/ui/FloatingBotButton';

// Feature Modals & Widgets
import MentorChatModal from '../features/mentorship/MentorChatModal';
import LostAndFoundChatModal from '../features/lostAndFound/LostAndFoundChatModal';
import MarketplaceChatModal from '../features/marketplace/MarketplaceChatModal';
import StudentChatWidget from '../features/chat/StudentChatWidget';
import VirtualAssistantChatbot from '../features/chat/VirtualAssistantChatbot';

// Icons & Graphics
import { Menu, AlertTriangle, Loader2 } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

// --- OPTIMIZED BACKGROUND COMPONENT ---
const ThreeDBackground = () => {
    const ref = useRef();
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.02; 
        }
    });
    return <Stars ref={ref} radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />;
};

const DashboardPage = () => {
    const { user, role, loading, handleLogout, mentorData, setMentorData } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isBotChatOpen, setIsBotChatOpen] = useState(false);
    const navigate = useNavigate();
    
    // Chat Modal States
    const [activeMentorChat, setActiveMentorChat] = useState(null);
    const [activeLostAndFoundChat, setActiveLostAndFoundChat] = useState(null);
    const [activeMarketplaceChat, setActiveMarketplaceChat] = useState(null);

    // SOS Modal State
    const [sosModal, setSosModal] = useState({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: '',
      variant: 'default',
      isLoading: false
    });

    // --- SOS FUNCTIONALITY ---
    const handlePanic = async () => { 
        setSosModal({
            isOpen: true,
            title: "Emergency Alert",
            message: "Are you sure you want to send an emergency alert? This will notify campus security and admins.",
            confirmText: "Send SOS",
            variant: "danger",
            onConfirm: () => {
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
                    onConfirm: null,
                    confirmText: "Close",
                    variant: "default",
                    isLoading: false,
                });
                return;
            }

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
            });
            const { latitude, longitude } = position.coords;

            const sendEmergencyAlert = httpsCallable(functions, 'sendEmergencyAlert');
            
            await sendEmergencyAlert({ 
                latitude, 
                longitude,
                displayName: user.displayName,
                email: user.email 
            });
            
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

    const userName = !loading && user ? (user.displayName || user.email.split('@')[0]) : '...';

    // ✅ FIXED: Context is now memoized and clean.
    // I REMOVED the 'complaints' state and fetching logic from this file.
    // This stops the Dashboard from re-rendering constantly and lets ComplaintList handle its own data.
    const contextValue = useMemo(() => ({ 
        user, 
        role, 
        mentorData, 
        setMentorData,
        onChat: setActiveMentorChat,
        setActiveMarketplaceChat, 
        setActiveLostAndFoundChat 
    }), [user, role, mentorData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <Loader2 className="animate-spin h-10 w-10" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 selection:bg-cyan-500/30 font-sans overflow-hidden">
            {/* --- BACKGROUND --- */}
            <div className="absolute inset-0 -z-20">
                <Canvas dpr={[1, 1.5]}>
                    <Suspense fallback={null}><ThreeDBackground /></Suspense>
                </Canvas>
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-slate-900/80 to-black/50 pointer-events-none" />

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300" 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            {user && <Sidebar 
                user={user} 
                role={role} 
                onLogout={handleLogout} 
                isOpen={isMobileMenuOpen} 
                setIsOpen={setIsMobileMenuOpen} 
            />}

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8 lg:py-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5 z-20 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-300 hover:text-white transition-colors p-1">
                            <Menu size={24} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight leading-none">
                                <span className="hidden xs:inline text-slate-400 font-normal">Welcome, </span>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{userName}</span>
                            </h1>
                            <p className="text-slate-500 mt-1 text-xs hidden sm:block font-medium">
                                Campus updates dashboard
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">
                        {user && <NotificationBell user={user} role={role} onNavigate={(path) => navigate(path)} />}
                        
                        {role === 'student' && (
                            <button 
                                onClick={handlePanic} 
                                disabled={loading}
                                className="group relative px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600/10 border border-red-500/50 text-red-500 font-bold rounded-lg flex items-center gap-2 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-red-900/20"
                            >
                                <span className="absolute inset-0 bg-red-600/20 animate-pulse group-hover:animate-none"></span>
                                <AlertTriangle size={18} className="relative z-10" />
                                <span className="hidden sm:inline relative z-10">SOS</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Page Content - Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10 scroll-smooth">
                    {user ? <Outlet context={contextValue} /> : (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin h-8 w-8 text-cyan-500" />
                        </div>
                    )}
                </div>
            </main>

            {/* --- FLOATERS & WIDGETS --- */}

            {/* AI Assistant Button */}
            {role === 'student' && (
                <FloatingBotButton 
                    onClick={() => setIsBotChatOpen(true)} 
                    className="fixed z-40 bottom-24 right-4 md:bottom-8 md:right-28 transition-all duration-300 hover:scale-110"
                />
            )}

            {/* Standard Chat Widget */}
            {role === 'student' && <StudentChatWidget user={user} />}

            {/* Modals */}
            {activeMentorChat && (
                <MentorChatModal 
                    user={user} 
                    chatWith={activeMentorChat} 
                    onClose={() => setActiveMentorChat(null)} 
                    role={role} 
                />
            )}
            {activeLostAndFoundChat && (
                <LostAndFoundChatModal 
                    user={user} 
                    chatInfo={activeLostAndFoundChat} 
                    onClose={() => setActiveLostAndFoundChat(null)} 
                />
            )}
            {activeMarketplaceChat && (
                <MarketplaceChatModal 
                    user={user} 
                    chatInfo={activeMarketplaceChat} 
                    onClose={() => setActiveMarketplaceChat(null)} 
                />
            )}

            {/* SOS Confirmation Modal */}
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
            
            {/* Virtual Assistant Chatbot Interface */}
            {role === 'student' && isBotChatOpen && (
                <VirtualAssistantChatbot 
                    isOpen={isBotChatOpen} 
                    onClose={() => setIsBotChatOpen(false)} 
                />
            )}
        </div>
    );
};

export default DashboardPage;