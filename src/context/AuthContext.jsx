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
                try {
                    // 1. OPTIMIZED TOKEN REFRESH
                    // Default to cached token for performance (fast startup).
                    let tokenResult = await currentUser.getIdTokenResult();
                    let claims = tokenResult.claims;

                    // "When it should be there" Check:
                    // If it's a System Email (@system.com) but the 'department' claim is missing,
                    // we FORCE a refresh because we know they *should* have it if they are legit.
                    if (currentUser.email?.endsWith('@system.com') && !claims.department && !claims.admin) {
                        console.log("🔄 System user detected with stale claims. Forcing token refresh...");
                        tokenResult = await currentUser.getIdTokenResult(true);
                        claims = tokenResult.claims;
                    }

                    // --- DIAGNOSTIC LOG (CHECK CONSOLE) ---
                    console.log("🔍 FRONTEND CLAIMS CHECK:", claims);

                    // --- ADMIN BYPASS ---
                    // If the user is an Admin (verified by Claim), they bypass status checks.
                    if (claims.admin === true) {
                        console.log("✅ FRONTEND: I AM ADMIN - Bypassing status checks.");
                        setUser(currentUser);
                        setRole('admin');
                        setLoading(false);
                        return;
                    }

                    // --- DEPARTMENT BYPASS ---
                    // If the user has the department claim, they bypass standard checks.
                    if (claims.department === true) {
                        console.log("✅ FRONTEND: I AM DEPARTMENT - Bypassing status checks.");
                        setUser(currentUser);
                        setRole('department');
                        setLoading(false);
                        return;
                    }

                    // 2. Fetch User Profile from Firestore to determine Role & Status
                    let determinedRole = 'student'; // Default safe role
                    let status = 'pending'; // Default safe status

                    const userRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userRef);

                    const mentorRef = doc(db, 'mentors', currentUser.uid);
                    const mentorSnap = await getDoc(mentorRef);

                    if (userSnap.exists()) {
                        // --- CASE A: STANDARD USER / STUDENT ---
                        const userData = userSnap.data();
                        determinedRole = userData.role || 'student';
                        
                        // Check for specific status. If missing (legacy user), assume approved.
                        if (userData.status !== undefined) {
                            status = userData.status;
                        } else {
                            status = 'approved';
                        }

                    } else if (mentorSnap.exists()) {
                        // --- CASE B: MENTOR ---
                        const mentorProfile = mentorSnap.data();
                        setMentorData(mentorProfile);
                        determinedRole = 'mentor';
                        
                        // ✅ CRITICAL FIX: Default to 'pending' if status is missing for Mentors
                        // This prevents unauthorized access if the backend hasn't processed them yet.
                        status = mentorProfile.status || 'pending'; 
                    
                    } else {
                        // --- CASE C: NO PROFILE FOUND (BUG FIX) ---
                        // Previously, we automatically granted 'department' role to @system.com emails here.
                        // We have REMOVED that. Now, if no profile exists, we treat them as a 'guest' or 'student'
                        // with 'pending' status. They must wait for their Firestore doc to be created.
                        console.warn("⚠️ No Firestore profile found for user. Defaulting to safe state.");
                        determinedRole = 'student';
                        status = 'pending';
                    }

                    setUser(currentUser);

                    // 3. Logic Gate: Apply Status Restrictions
                    if (status === 'pending') {
                        // User is registered but not approved by admin
                        // This catches BOTH pending students AND pending mentors
                        setRole('pending_approval');
                        setIsAwaitingVerification(false); // Don't show email verify if they aren't even approved yet
                    } else if (status === 'rejected') {
                        // User was rejected by admin
                        setRole('rejected_user');
                    } else {
                        // User is APPROVED. Now assign their actual role.
                        setRole(determinedRole);

                        // 4. Email Verification Check (Only for approved students)
                        if (determinedRole === 'student' && !currentUser.emailVerified) {
                            setIsAwaitingVerification(true);
                        } else {
                            setIsAwaitingVerification(false);
                        }
                    }

                } catch (error) {
                    console.error("Error initializing user session:", error);
                    // Fallback to safe state on error
                    setUser(null);
                    setRole(null);
                }
            } else {
                // User is signed out
                setUser(null);
                setRole(null);
                setMentorData(null);
                setIsAwaitingVerification(false);
            }
            // Signal that the initial auth check is complete.
            setLoading(false); 
        });

        // Cleanup subscription on unmount
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
    
    // Gates the application until Firebase + Custom Claims are fully loaded.
    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen bg-slate-950">
                    <div className="flex flex-col items-center gap-4">
                        <Spinner color="border-cyan-400" size="h-12 w-12"/>
                        <p className="text-slate-400">Verifying Credentials...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};