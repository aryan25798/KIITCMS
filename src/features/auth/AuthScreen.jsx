import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    sendEmailVerification,
    setPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mail, 
    Lock, 
    User, 
    AlertCircle, 
    GraduationCap, 
    Award, 
    Building2, 
    ShieldCheck, 
    ArrowRight
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

// --- VISUAL ASSETS & CONFIG ---
const ROLES = [
    { id: 'student', label: 'Student', icon: GraduationCap },
    { id: 'mentor', label: 'Mentor', icon: Award },
    { id: 'department', label: 'Dept', icon: Building2 },
    { id: 'admin', label: 'Admin', icon: ShieldCheck },
];

const THEMES = {
    student: { 
        gradient: 'from-cyan-500 to-blue-600', 
        shadow: 'shadow-cyan-500/20', 
        text: 'text-cyan-400', 
        bg: 'bg-cyan-500',
        border: 'focus:border-cyan-400'
    },
    mentor: { 
        gradient: 'from-emerald-500 to-teal-600', 
        shadow: 'shadow-emerald-500/20', 
        text: 'text-emerald-400', 
        bg: 'bg-emerald-500',
        border: 'focus:border-emerald-400'
    },
    department: { 
        gradient: 'from-violet-500 to-purple-600', 
        shadow: 'shadow-violet-500/20', 
        text: 'text-violet-400', 
        bg: 'bg-violet-500',
        border: 'focus:border-violet-400'
    },
    admin: { 
        gradient: 'from-rose-500 to-orange-600', 
        shadow: 'shadow-rose-500/20', 
        text: 'text-rose-400', 
        bg: 'bg-rose-500',
        border: 'focus:border-rose-400'
    },
};

const AuthScreen = () => {
    // --- STATE ---
    const [loginMode, setLoginMode] = useState('student');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isMounted = useRef(true);
    const activeTheme = useMemo(() => THEMES[loginMode], [loginMode]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // --- AUTH LOGIC ---
    const handleAuthAction = async (action) => {
        setLoading(true);
        setError('');
        
        try {
            await setPersistence(auth, browserSessionPersistence);

            if (action === 'signup') {
                // 1. Create Authentication User
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                // 2. Handle Role Specific Logic (Cloud Function handles Department now)
                if (loginMode === 'student') {
                    // Client-side DB creation is okay for students (they default to pending)
                    const userDocRef = doc(db, "users", user.uid);
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: name,
                        role: loginMode,
                        status: 'pending', 
                        createdAt: serverTimestamp()
                    });
                    
                    // Students still get email verification
                    await sendEmailVerification(user);

                } else if (loginMode === 'mentor') {
                    // Mentors have their own collection
                    await setDoc(doc(db, "mentors", user.uid), {
                        uid: user.uid, 
                        name: name, 
                        email: user.email, 
                        status: "pending", 
                        bio: "",
                        expertise: [], 
                        profilePicture: "", 
                        createdAt: serverTimestamp()
                    });
                    
                    // Notify Admins
                    await createNotification({
                        recipientRole: 'admin',
                        message: `New mentor registration: ${name}`,
                        type: 'mentor_approval'
                    });

                } else if (loginMode === 'department') {
                    // --- CLOUD FUNCTION HANDOFF ---
                    // We DO NOT write to Firestore here.
                    // The Cloud Function 'processNewUser' in functions/index.js 
                    // detects the @system.com email and creates the 'department' doc + claim.
                    
                    console.log("Department signup detected. Waiting for Cloud Function...");
                    
                    // Small delay to allow Cloud Function to process the new user 
                    // before the AuthContext refreshes the token.
                    await new Promise(r => setTimeout(r, 2000));

                } else {
                    // Only Admin is restricted from frontend signup
                    setError('Restricted access. Admins must be set via console.');
                }

            } else if (action === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            
            } else if (action === 'google') {
                if (loginMode !== 'student') throw new Error('Google sign-in is for students only.');
                const provider = new GoogleAuthProvider();
                const cred = await signInWithPopup(auth, provider);
                
                // Check & Create User Doc if missing
                const userRef = doc(db, "users", cred.user.uid);
                const snap = await getDoc(userRef);
                
                if (!snap.exists()) {
                    await setDoc(userRef, {
                        uid: cred.user.uid,
                        email: cred.user.email,
                        displayName: cred.user.displayName,
                        role: 'student',
                        status: 'pending', // <--- Ensure Google signups are also pending
                        createdAt: serverTimestamp()
                    });
                }
            }
        } catch (err) {
            console.error(err);
            let msg = 'Authentication failed.';
            if (err.code?.includes('invalid-email')) msg = 'Please enter a valid email.';
            else if (err.code?.includes('user-not-found') || err.code?.includes('wrong-password')) msg = 'Invalid email or password.';
            else if (err.code?.includes('email-already-in-use')) msg = 'This email is already registered.';
            else if (err.message) msg = err.message;
            if (isMounted.current) setError(msg);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    // --- ANIMATION VARIANTS ---
    const pageVariants = {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
        exit: { opacity: 0, scale: 0.95 }
    };

    const contentVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#050B14] overflow-hidden selection:bg-white/20">
            
            {/* --- 1. DYNAMIC BACKGROUND --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Aurora Blobs */}
                <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className={`absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full mix-blend-screen filter blur-[100px] opacity-20 bg-gradient-to-r ${activeTheme.gradient}`}
                />
                <motion.div 
                    animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[100px] opacity-10 bg-blue-600/30"
                />
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center"></div>
            </div>

            {/* --- 2. GLASS CARD --- */}
            <motion.div 
                variants={pageVariants}
                initial="initial"
                animate="animate"
                className="relative z-10 w-full max-w-[1000px] h-[auto] md:h-[650px] flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl"
            >
                
                {/* LEFT SIDE: BRANDING (Hidden on Mobile) */}
                <div className="hidden md:flex w-5/12 flex-col justify-between p-10 relative overflow-hidden">
                    <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${activeTheme.gradient}`}></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                <span className="font-bold text-white text-xl">K</span>
                            </div>
                            <span className="text-xl font-bold tracking-wide text-white">Smart Portal</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Gateway</span> to Academic Excellence.
                        </h1>
                    </div>
                    
                    {/* Testimonial / Stat */}
                    <div className="relative z-10 bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/5">
                        <p className="text-slate-300 text-sm leading-relaxed italic">
                            "A unified platform connecting students, mentors, and administration seamlessly."
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800" />)}
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Joined by 10k+ users</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: AUTH FORM */}
                <div className="w-full md:w-7/12 p-6 sm:p-10 md:p-12 bg-slate-900/60 flex flex-col justify-center relative">
                    
                    {/* Role Selector Tabs */}
                    <div className="flex justify-between items-center bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 mb-8 overflow-x-auto no-scrollbar">
                        {ROLES.map((role) => {
                            const Icon = role.icon;
                            const isActive = loginMode === role.id;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => { setLoginMode(role.id); setIsLogin(true); setError(''); }}
                                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 min-w-[90px] justify-center ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeRole"
                                            className={`absolute inset-0 rounded-xl bg-gradient-to-r ${activeTheme.gradient} opacity-100 shadow-lg ${activeTheme.shadow}`}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Icon size={16} />
                                        <span>{role.label}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                        <p className="text-slate-400 text-sm">
                            {isLogin ? `Login to access your ${loginMode} dashboard.` : `Register as a new ${loginMode}.`}
                        </p>
                    </div>

                    {/* Form Container */}
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={isLogin ? 'login' : 'register'}
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <form onSubmit={(e) => { e.preventDefault(); handleAuthAction(isLogin ? 'login' : 'signup'); }} className="space-y-5">
                                {/* Error Message */}
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                                        <AlertCircle size={16} /> {error}
                                    </motion.div>
                                )}

                                {/* Name Field (Signup Only) */}
                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className={`absolute left-4 top-3.5 ${activeTheme.text} transition-colors group-focus-within:text-white`} size={20} />
                                            <input 
                                                type="text" 
                                                required 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-300 focus:bg-slate-800 focus:ring-1 ${activeTheme.border.replace('focus:', 'focus:ring-')}`}
                                                placeholder="John Doe" 
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Email Field */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative group">
                                        <Mail className={`absolute left-4 top-3.5 ${activeTheme.text} transition-colors group-focus-within:text-white`} size={20} />
                                        <input 
                                            type="email" 
                                            required 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-300 focus:bg-slate-800 focus:ring-1 ${activeTheme.border.replace('focus:', 'focus:ring-')}`}
                                            placeholder="you@university.edu" 
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className={`absolute left-4 top-3.5 ${activeTheme.text} transition-colors group-focus-within:text-white`} size={20} />
                                        <input 
                                            type="password" 
                                            required 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-300 focus:bg-slate-800 focus:ring-1 ${activeTheme.border.replace('focus:', 'focus:ring-')}`}
                                            placeholder="••••••••" 
                                        />
                                    </div>
                                </div>

                                {/* Action Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loading}
                                    type="submit"
                                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r ${activeTheme.gradient} hover:shadow-lg hover:shadow-${activeTheme.bg}/20 transition-all`}
                                >
                                    {loading ? <Spinner size="w-5 h-5" color="border-white" /> : (
                                        <>
                                            {isLogin ? 'Sign In' : 'Create Account'}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            {/* Footer / Toggle */}
                            <div className="mt-8 text-center">
                                {(loginMode === 'student' || loginMode === 'mentor' || loginMode === 'department') && (
                                    <>
                                        <p className="text-slate-500 text-sm mb-4">
                                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                                            <button 
                                                onClick={() => setIsLogin(!isLogin)} 
                                                className={`font-semibold ${activeTheme.text} hover:underline focus:outline-none`}
                                            >
                                                {isLogin ? 'Sign Up' : 'Log In'}
                                            </button>
                                        </p>

                                        {/* Divider */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                            <span className="text-xs text-slate-600 font-medium">OR CONTINUE WITH</span>
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                        </div>

                                        {/* Social Login (Google) */}
                                        {loginMode === 'student' && isLogin && (
                                            <button 
                                                type="button"
                                                onClick={() => handleAuthAction('google')}
                                                disabled={loading}
                                                className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors"
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                                Google
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthScreen;