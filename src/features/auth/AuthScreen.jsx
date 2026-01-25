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
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { createNotification } from '../../services/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mail, Lock, User, AlertCircle, ArrowRight, 
    GraduationCap, Award, Building2, ShieldCheck, 
    Zap, Globe, ChevronRight, Terminal
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

// --- GAMIFIED CONFIGURATION ---
const ROLES = [
    { 
        id: 'student', 
        label: 'Student', 
        icon: GraduationCap, 
        color: 'from-cyan-400 to-blue-600',
        hex: '#22d3ee',
        tagline: 'Access Learning Portal',
        desc: 'Track attendance, view grades, and connect with peers.'
    },
    { 
        id: 'mentor', 
        label: 'Mentor', 
        icon: Award, 
        color: 'from-emerald-400 to-teal-600',
        hex: '#34d399',
        tagline: 'Manage Mentorship',
        desc: 'Guide students and approve requests.'
    },
    { 
        id: 'department', 
        label: 'Dept.', 
        icon: Building2, 
        color: 'from-violet-400 to-purple-600',
        hex: '#a78bfa',
        tagline: 'Department Control',
        desc: 'Oversee faculty and curriculum resources.'
    },
    { 
        id: 'admin', 
        label: 'Admin', 
        icon: ShieldCheck, 
        color: 'from-rose-400 to-red-600',
        hex: '#fb7185',
        tagline: 'System Administration',
        desc: 'Global settings and user management.'
    },
];

const AuthScreen = () => {
    // --- LOGIC STATE (UNCHANGED) ---
    const [loginMode, setLoginMode] = useState('student');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // UI State
    const [focusedField, setFocusedField] = useState(null);
    const isMounted = useRef(true);
    
    const activeRole = useMemo(() => ROLES.find(r => r.id === loginMode), [loginMode]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // --- AUTH LOGIC (PRESERVED) ---
    const handleAuthAction = async (action) => {
        setLoading(true);
        setError('');
        
        try {
            await setPersistence(auth, browserSessionPersistence);

            if (action === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                if (loginMode === 'student') {
                    const userDocRef = doc(db, "users", user.uid);
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: name,
                        role: loginMode,
                        status: 'pending', 
                        createdAt: serverTimestamp()
                    });
                    await sendEmailVerification(user);

                } else if (loginMode === 'mentor') {
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
                    await createNotification({
                        recipientRole: 'admin',
                        message: `New mentor registration: ${name}`,
                        type: 'mentor_approval'
                    });

                } else if (loginMode === 'department') {
                    console.log("Department signup detected. Waiting for Cloud Function provisioning...");
                    await new Promise((resolve) => {
                        const userDocRef = doc(db, "users", user.uid);
                        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const userData = docSnap.data();
                                if (userData.role === 'department' || userData.departmentName) {
                                    unsubscribe();
                                    resolve();
                                }
                            }
                        });
                        setTimeout(() => {
                            unsubscribe();
                            if (isMounted.current) resolve(); 
                        }, 15000); 
                    });

                } else {
                    setError('Restricted access. Admins must be set via console.');
                }

            } else if (action === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            
            } else if (action === 'google') {
                if (loginMode !== 'student') throw new Error('Google sign-in is for students only.');
                const provider = new GoogleAuthProvider();
                const cred = await signInWithPopup(auth, provider);
                const userRef = doc(db, "users", cred.user.uid);
                const snap = await getDoc(userRef);
                
                if (!snap.exists()) {
                    await setDoc(userRef, {
                        uid: cred.user.uid,
                        email: cred.user.email,
                        displayName: cred.user.displayName,
                        role: 'student',
                        status: 'pending',
                        createdAt: serverTimestamp()
                    });
                }
            }
        } catch (err) {
            console.error(err);
            let msg = 'Authentication failed.';
            if (err.code?.includes('popup-closed-by-user')) msg = 'Sign-in cancelled.';
            else if (err.code?.includes('invalid-email')) msg = 'Please enter a valid email.';
            else if (err.code?.includes('user-not-found') || err.code?.includes('wrong-password') || err.code?.includes('invalid-credential')) msg = 'Invalid email or password.';
            else if (err.code?.includes('email-already-in-use')) msg = 'This email is already registered.';
            else if (err.message) msg = err.message;
            
            if (isMounted.current) setError(msg);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    // --- ANIMATIONS ---
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-white font-sans selection:bg-white/20">
            
            {/* === LEFT PANEL: IMMERSIVE VISUALS (45%) === */}
            <motion.div 
                className="hidden lg:flex relative w-[45%] h-full flex-col justify-between p-12 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                {/* Dynamic Background Gradient */}
                <motion.div 
                    key={activeRole.id}
                    className={`absolute inset-0 bg-gradient-to-br ${activeRole.color} opacity-20`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.2 }}
                    transition={{ duration: 0.8 }}
                />
                
                {/* Moving Grid Background */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 animate-pulse" style={{ backgroundSize: '50px 50px' }}></div>

                {/* Top Branding */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                            <Zap size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-widest uppercase opacity-80">Smart Portal</span>
                    </div>
                </div>

                {/* Middle: Role Showcase */}
                <div className="relative z-10 flex flex-col justify-center h-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeRole.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-7xl font-black mb-4 tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                                {activeRole.label}
                            </h1>
                            <p className="text-2xl text-slate-300 font-light max-w-md">
                                {activeRole.tagline}
                            </p>
                            <div className="mt-8 flex gap-4">
                                <div className="h-1 w-24 rounded-full bg-gradient-to-r from-white to-transparent"></div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom: Stats/Decor */}
                <div className="relative z-10">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
                        <span>System Status: Online</span>
                        <span>•</span>
                        <span>V.1.0.4</span>
                        <span>•</span>
                        <span>Secure Connection</span>
                    </div>
                </div>
            </motion.div>

            {/* === RIGHT PANEL: THE CONTROL DECK (55%) === */}
            <div className="w-full lg:w-[55%] h-full bg-slate-900 flex flex-col relative">
                
                {/* Mobile Header */}
                <div className="lg:hidden p-6 pb-0 flex items-center justify-between">
                    <span className="font-bold text-lg">Smart Portal</span>
                    <div className={`h-2 w-2 rounded-full bg-${activeRole.id === 'student' ? 'cyan' : 'emerald'}-500 shadow-[0_0_10px_currentColor]`}></div>
                </div>

                {/* Scrollable Form Container */}
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-20 md:py-12 flex flex-col justify-center">
                    
                    <div className="max-w-md w-full mx-auto space-y-10">
                        
                        {/* 1. Header & Toggle */}
                        <div className="text-center lg:text-left space-y-2">
                            <motion.h2 
                                layoutId="title"
                                className="text-4xl font-bold text-white tracking-tight"
                            >
                                {isLogin ? 'Welcome Back' : 'Initialize Account'}
                            </motion.h2>
                            <p className="text-slate-400">
                                {isLogin ? 'Enter your credentials to access the dashboard.' : 'Setup your profile to join the network.'}
                            </p>
                        </div>

                        {/* 2. Gamified Role Selector */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Identity</label>
                            <div className="grid grid-cols-4 gap-2 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                                {ROLES.map((role) => {
                                    const isActive = loginMode === role.id;
                                    const Icon = role.icon;
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => { setLoginMode(role.id); setIsLogin(true); setError(''); }}
                                            className={`relative flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 group ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                                        >
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-slate-800 rounded-xl shadow-lg border border-slate-700"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <Icon size={20} className={`relative z-10 mb-1 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`} style={{ color: isActive ? role.hex : undefined }} />
                                            <span className="relative z-10 text-[10px] font-bold uppercase">{role.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.p 
                                    key={activeRole.id}
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xs text-center lg:text-left text-slate-500 font-medium"
                                >
                                    {activeRole.desc}
                                </motion.p>
                            </AnimatePresence>
                        </div>

                        {/* 3. The Form */}
                        <motion.form 
                            variants={fadeInUp} 
                            initial="hidden" 
                            animate="visible" 
                            onSubmit={(e) => { e.preventDefault(); handleAuthAction(isLogin ? 'login' : 'signup'); }} 
                            className="space-y-5"
                        >
                            {/* Error Banner */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 flex items-center gap-3 text-red-400 text-sm rounded-r-lg">
                                            <AlertCircle size={18} /> 
                                            <span className="font-medium">{error}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Inputs */}
                            <div className="space-y-4">
                                {!isLogin && (
                                    <div className={`relative transition-all duration-300 ${focusedField === 'name' ? 'scale-[1.02]' : 'scale-100'}`}>
                                        <User className={`absolute left-4 top-4 ${focusedField === 'name' ? 'text-white' : 'text-slate-500'}`} size={20} />
                                        <input 
                                            type="text" 
                                            required 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onFocus={() => setFocusedField('name')}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner"
                                            placeholder="Full Name" 
                                        />
                                    </div>
                                )}

                                <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : 'scale-100'}`}>
                                    <Mail className={`absolute left-4 top-4 ${focusedField === 'email' ? 'text-white' : 'text-slate-500'}`} size={20} />
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner"
                                        placeholder="University Email" 
                                    />
                                </div>

                                <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : 'scale-100'}`}>
                                    <Lock className={`absolute left-4 top-4 ${focusedField === 'password' ? 'text-white' : 'text-slate-500'}`} size={20} />
                                    <input 
                                        type="password" 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-inner"
                                        placeholder="Passcode" 
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${activeRole.hex}40` }}
                                whileTap={{ scale: 0.98 }}
                                disabled={loading}
                                type="submit"
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all bg-gradient-to-r ${activeRole.color}`}
                            >
                                {loading ? <Spinner size="w-5 h-5" color="border-white" /> : (
                                    <>
                                        <span>{isLogin ? 'Initiate Login' : 'Create Access'}</span>
                                        <ChevronRight size={20} />
                                    </>
                                )}
                            </motion.button>
                        </motion.form>

                        {/* 4. Footer Actions */}
                        <div className="space-y-6">
                            {/* Toggle Sign Up / Login */}
                            <div className="text-center">
                                <p className="text-slate-500 text-sm">
                                    {isLogin ? "New to the system?" : "Already verified?"}{' '}
                                    <button 
                                        onClick={() => setIsLogin(!isLogin)} 
                                        className="font-bold hover:underline transition-colors"
                                        style={{ color: activeRole.hex }}
                                    >
                                        {isLogin ? 'Register Now' : 'Login'}
                                    </button>
                                </p>
                            </div>

                            {/* Google Sign In */}
                            {loginMode === 'student' && isLogin && (
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-slate-800"></div>
                                        <span className="text-xs text-slate-600 font-mono uppercase">Or Connect With</span>
                                        <div className="h-px flex-1 bg-slate-800"></div>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={() => handleAuthAction('google')}
                                        disabled={loading}
                                        className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors shadow-xl"
                                    >
                                        <Globe size={18} className="text-blue-600" />
                                        Continue with Google
                                    </button>
                                </>
                            )}
                        </div>

                    </div>
                </div>
                
                {/* Decorative Bottom Bar */}
                <div className="h-2 w-full bg-slate-950 flex">
                    <div className={`h-full w-1/3 bg-gradient-to-r ${activeRole.color}`}></div>
                    <div className="h-full w-2/3 bg-slate-900"></div>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;