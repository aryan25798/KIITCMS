import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Spinner from '../components/ui/Spinner';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [mentorData, setMentorData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
    const [resendStatus, setResendStatus] = useState('');

    useEffect(() => {
        // onAuthStateChanged is an observer that fires whenever the user's sign-in state changes.
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Force a token refresh to ensure the SDK has the latest token.
                // This is a crucial step for callable functions.
                await currentUser.getIdToken(true);
                await currentUser.reload();
                
                setUser(currentUser);
                
                let determinedRole = 'student'; // Default role
                if (currentUser.email === 'admin@system.com') {
                    determinedRole = 'admin';
                } else if (currentUser.email.endsWith('@system.com')) {
                    determinedRole = 'department';
                } else {
                    const mentorRef = doc(db, 'mentors', currentUser.uid);
                    const mentorSnap = await getDoc(mentorRef);
                    if (mentorSnap.exists()) {
                        const mentorProfile = mentorSnap.data();
                        setMentorData(mentorProfile);
                        if (mentorProfile.status === 'approved') {
                            determinedRole = 'mentor';
                        } else if (mentorProfile.status === 'pending') {
                            determinedRole = 'pending_mentor';
                        }
                    }
                }
                setRole(determinedRole);

                if (determinedRole === 'student' && !currentUser.emailVerified) {
                    setIsAwaitingVerification(true);
                } else {
                    setIsAwaitingVerification(false);
                }

            } else {
                setUser(null);
                setRole(null);
                setMentorData(null);
                setIsAwaitingVerification(false);
            }
            // This now correctly signals that the initial auth check is complete.
            setLoading(false); 
        });

        // The cleanup function provided by onAuthStateChanged detaches the listener when the component unmounts.
        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        signOut(auth);
    };

    const handleResendVerification = async () => {
        if (auth.currentUser) {
            setResendStatus('');
            try {
                await sendEmailVerification(auth.currentUser);
                setResendStatus('A new verification email has been sent.');
            } catch (error) {
                console.error("Error resending verification email:", error);
                setResendStatus('Failed to send email. Please try again in a few minutes.');
            }
        }
    };

    const value = {
        user,
        role,
        loading,
        mentorData,
        setMentorData,
        isAwaitingVerification,
        resendStatus,
        handleLogout,
        handleResendVerification,
    };
    
    // The loading prop now correctly gates the entire application until Firebase has confirmed the user's auth state.
    // This prevents any component from rendering and attempting an authenticated action before the token is ready.
    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen bg-slate-950">
                    <div className="flex flex-col items-center gap-4">
                        <Spinner color="border-cyan-400" size="h-12 w-12"/>
                        <p className="text-slate-400">Initializing System...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
