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
    Zap, Globe, ChevronRight, Terminal, Cpu, Scan, Wifi,
    Activity, Server, Database, Code
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
        shadow: 'shadow-cyan-500/50',
        tagline: 'Learning Protocol',
        desc: 'Access neural knowledge base and track progress.',
        visualType: 'matrix'
    },
    {
        id: 'mentor',
        label: 'Mentor',
        icon: Award,
        color: 'from-emerald-400 to-teal-600',
        hex: '#34d399',
        shadow: 'shadow-emerald-500/50',
        tagline: 'Guidance System',
        desc: 'Shape future nodes and validate credentials.',
        visualType: 'network'
    },
    {
        id: 'department',
        label: 'Dept.',
        icon: Building2,
        color: 'from-violet-400 to-purple-600',
        hex: '#a78bfa',
        shadow: 'shadow-violet-500/50',
        tagline: 'Sector Control',
        desc: 'Manage infrastructure and resource allocation.',
        visualType: 'grid'
    },
    {
        id: 'admin',
        label: 'Admin',
        icon: ShieldCheck,
        color: 'from-rose-400 to-red-600',
        hex: '#fb7185',
        shadow: 'shadow-rose-500/50',
        tagline: 'Core Access',
        desc: 'Oversee global system parameters and security.',
        visualType: 'shield'
    },
];

const AuthScreen = () => {
    // --- LOGIC STATE ---
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

    // --- AUTH LOGIC ---
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
            if (err.code?.includes('popup-closed-by-user')) msg = 'Operation cancelled.';
            else if (err.code?.includes('invalid-email')) msg = 'Invalid comms link format.';
            else if (err.code?.includes('user-not-found') || err.code?.includes('wrong-password')) msg = 'Credentials rejected.';
            else if (err.code?.includes('email-already-in-use')) msg = 'Identity already registered.';
            else if (err.message) msg = err.message;
            if (isMounted.current) setError(msg);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    // --- SUB-COMPONENTS ---

    const CornerBrackets = ({ color }) => (
        <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 transition-colors duration-500" style={{ borderColor: color }}></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-colors duration-500" style={{ borderColor: color }}></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 transition-colors duration-500" style={{ borderColor: color }}></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 transition-colors duration-500" style={{ borderColor: color }}></div>
        </div>
    );

    const TechInput = ({ icon: Icon, type, value, onChange, placeholder, fieldName }) => (
        <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${activeRole.color} opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 blur-xl rounded-lg`}></div>
            <div className="relative flex items-center bg-black/40 border border-slate-800 backdrop-blur-md rounded-lg p-1 transition-all duration-300 group-focus-within:border-white/30 group-focus-within:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <div className="p-3 text-slate-500 group-focus-within:text-white transition-colors">
                    <Icon size={18} />
                </div>
                <div className="h-6 w-[1px] bg-slate-800 group-focus-within:bg-slate-600 transition-colors mx-1"></div>
                <input
                    type={type}
                    required
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocusedField(fieldName)}
                    onBlur={() => setFocusedField(null)}
                    className="w-full bg-transparent border-none text-white placeholder-slate-600 focus:ring-0 px-4 py-3 outline-none font-mono text-sm tracking-wide"
                    placeholder={placeholder}
                />
                {focusedField === fieldName && (
                    <motion.div
                        layoutId="inputScan"
                        className={`absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r ${activeRole.color}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </div>
        </div>
    );

    // Dynamic Background Visuals based on Role
    const RoleVisuals = ({ type, color }) => {
        return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                {type === 'matrix' && (
                    <div className="flex justify-between px-10 h-full">
                        {[...Array(10)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: -100, opacity: 0 }}
                                animate={{ y: '100vh', opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: Math.random() * 3 + 2, delay: Math.random() * 2, ease: "linear" }}
                                className="w-[1px] bg-gradient-to-b from-transparent via-cyan-500 to-transparent h-40"
                            />
                        ))}
                    </div>
                )}
                {type === 'network' && (
                    <div className="absolute inset-0">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full bg-emerald-500 blur-xl"
                                style={{
                                    width: Math.random() * 100 + 50,
                                    height: Math.random() * 100 + 50,
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                }}
                                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                                transition={{ repeat: Infinity, duration: 4, delay: i }}
                            />
                        ))}
                    </div>
                )}
                {type === 'grid' && (
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(167,139,250,0.1)_25%,rgba(167,139,250,0.1)_26%,transparent_27%,transparent_74%,rgba(167,139,250,0.1)_75%,rgba(167,139,250,0.1)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(167,139,250,0.1)_25%,rgba(167,139,250,0.1)_26%,transparent_27%,transparent_74%,rgba(167,139,250,0.1)_75%,rgba(167,139,250,0.1)_76%,transparent_77%,transparent)] bg-[size:50px_50px]"></div>
                )}
                {type === 'shield' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                            className="w-[500px] h-[500px] border border-rose-500/20 rounded-full border-dashed"
                        />
                         <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                            className="absolute w-[300px] h-[300px] border border-rose-500/30 rounded-full border-dotted"
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-[#050505] text-white font-sans selection:bg-white/20 relative">
            
            {/* --- GLOBAL OVERLAYS --- */}
            {/* CRT Scanline Effect */}
            <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] opacity-20"></div>
            {/* Vignette */}
            <div className="fixed inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-80"></div>
            
            {/* --- ANIMATED BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                 {/* Moving Grid Floor */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] perspective-[500px] transform-style-3d"></div>
                
                {/* Active Role Ambient Glow */}
                <motion.div 
                    animate={{ 
                        background: `radial-gradient(circle at 60% 50%, ${activeRole.hex}15 0%, transparent 70%)`,
                    }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 pointer-events-none"
                />
            </div>

            {/* --- MAIN CONTENT CONTAINER --- */}
            <div className="relative z-10 flex flex-col lg:flex-row w-full h-full min-h-screen max-w-[1920px] mx-auto">

                {/* === LEFT PANEL: VISUAL IMMERSION (Desktop Only) === */}
                <motion.div 
                    className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-16 overflow-hidden border-r border-white/5 bg-black/40 backdrop-blur-sm"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Role Specific Visual Background */}
                    <RoleVisuals type={activeRole.visualType} />

                    {/* Top Tech Header */}
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="relative group cursor-pointer">
                                <div className={`absolute inset-0 bg-gradient-to-r ${activeRole.color} blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                <div className="relative p-3 bg-black border border-white/20 rounded-lg overflow-hidden">
                                    <Activity size={28} className="text-white relative z-10" />
                                    <div className={`absolute inset-0 bg-gradient-to-r ${activeRole.color} opacity-0 group-hover:opacity-20 transition-opacity`}></div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold tracking-[0.2em] uppercase text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Smart CMS</span>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-[10px] text-slate-400 font-mono tracking-widest">SYSTEM ONLINE v.2.4.0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center 3D/Holo Content */}
                    <div className="relative z-10 flex-1 flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeRole.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.4 }}
                            >
                                {/* Role ID Tag */}
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
                                    <activeRole.icon size={14} style={{ color: activeRole.hex }} />
                                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Class: {activeRole.id}</span>
                                </div>

                                {/* Main Title with Glitch Effect on Hover */}
                                <h1 className="text-7xl xl:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 tracking-tighter mb-6 leading-[0.9] group relative w-fit">
                                    {activeRole.label.toUpperCase()}
                                    <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-[2px] transition-all duration-100 mix-blend-difference">
                                         {activeRole.label.toUpperCase()}
                                    </span>
                                </h1>
                                
                                {/* Dynamic Underline */}
                                <motion.div 
                                    className={`h-1 bg-gradient-to-r ${activeRole.color} mb-8`}
                                    initial={{ width: 0 }}
                                    animate={{ width: 100 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                />
                                
                                <p className="text-2xl text-slate-300 font-light max-w-lg leading-relaxed">
                                    {activeRole.tagline}
                                </p>
                                <p className="mt-4 text-sm text-slate-500 font-mono max-w-md border-l border-slate-700 pl-4 py-1">
                                    {`// ${activeRole.desc}`}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bottom Stats Grid */}
                    <div className="relative z-10 grid grid-cols-3 gap-8 border-t border-white/10 pt-8">
                        <div>
                            <span className="text-[10px] text-slate-500 font-mono block mb-1">DATA FLOW</span>
                            <div className="flex items-end gap-1">
                                <span className="text-xl font-bold text-white">840</span>
                                <span className="text-xs text-emerald-400 mb-1">TB/s</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-emerald-500"
                                    animate={{ width: ["40%", "70%", "50%"] }}
                                    transition={{ repeat: Infinity, duration: 3 }}
                                />
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-mono block mb-1">ACTIVE NODES</span>
                            <div className="flex items-end gap-1">
                                <span className="text-xl font-bold text-white">4,209</span>
                            </div>
                             <div className="flex gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`h-1 flex-1 rounded-full ${i < 4 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-mono block mb-1">SECURITY</span>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-rose-500" />
                                <span className="text-sm font-bold text-white">MAXIMUM</span>
                            </div>
                            <span className="text-[10px] text-slate-600 font-mono mt-1 block">ENCRYPTION: QUANTUM</span>
                        </div>
                    </div>
                </motion.div>

                {/* === RIGHT PANEL: COMMAND DECK (Mobile & Desktop) === */}
                <div className="w-full lg:w-[55%] relative flex flex-col h-full overflow-y-auto">
                    
                    {/* Mobile Header (Only visible on small screens) */}
                    <div className="lg:hidden p-6 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-30">
                        <div className="flex items-center gap-2">
                            <Activity size={20} className={`text-${activeRole.id === 'student' ? 'cyan' : 'rose'}-400`} />
                            <span className="font-bold text-lg tracking-wider">SMART CMS</span>
                        </div>
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${activeRole.color} shadow-[0_0_10px_currentColor]`}></div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 relative">
                        
                        {/* Background Decoration for Form */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl aspect-square bg-gradient-to-tr from-slate-900 via-transparent to-transparent rounded-full opacity-50 blur-3xl pointer-events-none"></div>

                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-md relative z-20"
                        >
                            {/* THE CYBER CARD */}
                            <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden group">
                                
                                {/* Dynamic Top Border */}
                                <motion.div 
                                    className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${activeRole.color}`}
                                    layoutId="cardTop"
                                />
                                
                                {/* Decorative Corner Brackets */}
                                <CornerBrackets color={activeRole.hex} />

                                {/* Header */}
                                <div className="relative z-10 mb-8 text-center">
                                    <motion.h2 
                                        key={isLogin ? 'login' : 'signup'}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-3xl font-bold tracking-tight mb-2 text-white"
                                    >
                                        {isLogin ? 'Identity Verification' : 'Initialize Protocol'}
                                    </motion.h2>
                                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-mono uppercase">
                                        <span>Secure Connection</span>
                                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                                        <span>Est.</span>
                                    </div>
                                </div>

                                {/* Role Selector Grid */}
                                <div className="grid grid-cols-4 gap-2 mb-8 p-1 bg-slate-900/80 rounded-xl border border-white/5 backdrop-blur-md">
                                    {ROLES.map((role) => {
                                        const isActive = loginMode === role.id;
                                        const Icon = role.icon;
                                        return (
                                            <button
                                                key={role.id}
                                                onClick={() => { setLoginMode(role.id); setIsLogin(true); setError(''); }}
                                                className={`relative h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-300 overflow-hidden ${isActive ? '' : 'hover:bg-white/5'}`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="roleActive"
                                                        className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-20 border border-${role.hex} rounded-lg`}
                                                    />
                                                )}
                                                <Icon 
                                                    size={20} 
                                                    className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-slate-600'}`} 
                                                    style={{ color: isActive ? role.hex : undefined }}
                                                />
                                                <span className={`relative z-10 text-[9px] uppercase font-bold tracking-wider ${isActive ? 'text-white' : 'text-slate-600'}`}>
                                                    {role.id}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Form */}
                                <form onSubmit={(e) => { e.preventDefault(); handleAuthAction(isLogin ? 'login' : 'signup'); }} className="space-y-6 relative z-10">
                                    
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-red-500/10 border-l-2 border-red-500 p-3 flex items-start gap-3 text-red-400 text-xs font-mono">
                                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                    <span className="leading-tight">ERROR_CODE_401: {error}</span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-4">
                                        {!isLogin && (
                                            <TechInput 
                                                icon={User}
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="USER_ID // FULL NAME"
                                                fieldName="name"
                                            />
                                        )}
                                        <TechInput 
                                            icon={Mail}
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="COMMS_LINK // EMAIL"
                                            fieldName="email"
                                        />
                                        <TechInput 
                                            icon={Lock}
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="ACCESS_CODE // PASSWORD"
                                            fieldName="password"
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={loading}
                                        type="submit"
                                        className={`relative w-full py-4 rounded-lg font-bold text-white uppercase tracking-widest text-xs overflow-hidden group shadow-lg`}
                                        style={{ boxShadow: `0 0 20px ${activeRole.hex}20` }}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-r ${activeRole.color} transition-all duration-300 opacity-90 group-hover:opacity-100`}></div>
                                        {/* Animated Scanline on Button */}
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[size:250%_250%] animate-[shimmer_2s_infinite]"></div>
                                        
                                        <div className="relative flex items-center justify-center gap-2">
                                            {loading ? <Spinner size="w-4 h-4" color="border-white" /> : (
                                                <>
                                                    <Terminal size={14} />
                                                    <span>{isLogin ? 'EXECUTE LOGIN' : 'INITIALIZE REGISTRATION'}</span>
                                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </div>
                                    </motion.button>
                                </form>

                                {/* Footer Links */}
                                <div className="mt-8 relative z-10 flex flex-col gap-5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-slate-500">{isLogin ? 'NO CREDENTIALS?' : 'ALREADY VERIFIED?'}</span>
                                        <button 
                                            onClick={() => setIsLogin(!isLogin)}
                                            className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1 group"
                                        >
                                            {isLogin ? 'CREATE IDENTITY' : 'ACCESS TERMINAL'}
                                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    {loginMode === 'student' && isLogin && (
                                        <div className="pt-4 border-t border-white/5">
                                            <button 
                                                type="button"
                                                onClick={() => handleAuthAction('google')}
                                                disabled={loading}
                                                className="w-full py-3 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-3 text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                            >
                                                <Globe size={16} className="text-blue-600" />
                                                <span>Sync via Google</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile Bottom Stats */}
                        <div className="lg:hidden mt-8 text-center">
                            <p className="text-[10px] text-slate-600 font-mono">
                                SYSTEM STATUS: <span className="text-emerald-500">OPTIMAL</span> • V.2.4.0
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;