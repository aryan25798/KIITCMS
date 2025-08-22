import React, { useState, useMemo } from 'react';
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
import { Mail, KeyRound, User, UserPlus, AlertTriangle } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const AuthScreen = () => {
    const [loginMode, setLoginMode] = useState('student');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (action) => {
        setLoading(true);
        setError('');
        try {
            await setPersistence(auth, browserSessionPersistence);

            if (action === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: name,
                    role: loginMode,
                    createdAt: serverTimestamp()
                });

                if (loginMode === 'student') {
                    await sendEmailVerification(user);
                } else if (loginMode === 'mentor') {
                    await setDoc(doc(db, "mentors", user.uid), {
                        uid: user.uid, name: name, email: user.email, status: "pending", bio: "",
                        expertise: [], profilePicture: "", createdAt: serverTimestamp()
                    });
                    await createNotification({
                        recipientRole: 'admin',
                        message: `New mentor registration from ${name} (${user.email}) requires approval.`,
                        type: 'mentor_approval'
                    });
                } else {
                    setError('Sign up is only available for students and mentors.');
                }
            } else if (action === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else if (action === 'google') {
                if (loginMode !== 'student') {
                    setError('Google sign in is only for students.');
                    setLoading(false);
                    return;
                }
                const provider = new GoogleAuthProvider();
                const userCredential = await signInWithPopup(auth, provider);
                const user = userCredential.user;

                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        role: 'student',
                        createdAt: serverTimestamp()
                    });
                }
            }
        } catch (err) {
            switch (err.code) {
                case 'auth/invalid-email': setError('Please enter a valid email address.'); break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential': setError('Invalid credentials. Please check your email and password.'); break;
                case 'auth/email-already-in-use': setError('An account with this email already exists.'); break;
                case 'auth/popup-closed-by-user': setError('Google sign-in was cancelled.'); break;
                case 'auth/weak-password': setError('Password should be at least 6 characters long.'); break;
                default: setError('An unexpected error occurred. Please try again.');
            }
            console.error("Authentication error:", err);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (loginMode === 'admin') return 'Super Admin Portal';
        if (loginMode === 'department') return 'Department Portal';
        if (loginMode === 'mentor') return isLogin ? 'Mentor Login' : 'Mentor Registration';
        return isLogin ? 'Student Login' : 'Student Sign Up';
    };

    const themeColor = useMemo(() => {
        const themes = {
            student: { main: 'cyan', bg: 'bg-cyan-500 hover:bg-cyan-600', ring: 'focus:ring-cyan-500' },
            mentor: { main: 'green', bg: 'bg-green-600 hover:bg-green-700', ring: 'focus:ring-green-500' },
            department: { main: 'slate', bg: 'bg-slate-600 hover:bg-slate-700', ring: 'focus:ring-slate-500' },
            admin: { main: 'purple', bg: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-500' },
        };
        return themes[loginMode];
    }, [loginMode]);

    const formVariant = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
            </div>
            <div className="relative z-10 w-full max-w-4xl min-h-[600px] bg-slate-900/50 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl flex overflow-hidden">
                <div className="hidden md:flex flex-col justify-between w-1/2 p-10 bg-slate-800/30">
                    <div>
                        <div className="flex items-center gap-3">
                            <img src="/kiit.png" alt="KIIT Logo" className="h-12"/>
                            <span className="text-xl font-bold text-white">Smart Portal</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white mt-12 leading-tight">
                            Unified <br/> Campus <br/> Experience.
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm">
                        &copy; {new Date().getFullYear()} KIIT University. All rights reserved.
                    </p>
                </div>
                <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                    <div className="w-full max-w-sm mx-auto">
                        <div className="mb-8">
                            <div className="flex border border-slate-700 rounded-lg p-1">
                                {['student', 'mentor', 'department', 'admin'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => { setLoginMode(mode); setIsLogin(true); setError(''); }}
                                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors ${loginMode === mode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <motion.div key={loginMode} variants={formVariant} initial="hidden" animate="visible">
                            <h2 className="text-3xl font-bold text-white mb-2">{getTitle()}</h2>
                            <p className="text-slate-400 mb-8">
                                {loginMode === 'mentor' && !isLogin ? 'Register to become a mentor. Your application will be reviewed.' :
                                 loginMode === 'student' && isLogin ? 'Welcome back! Please enter your details.' :
                                 loginMode === 'student' && !isLogin ? 'Create a new student account.' :
                                 'Please enter your portal credentials.'}
                            </p>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg mb-6 flex items-center gap-3 text-sm"
                                    >
                                        <AlertTriangle size={20}/>
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={(e) => { e.preventDefault(); handleAuthAction(isLogin ? 'login' : 'signup'); }} className="space-y-4">
                                {!isLogin && (loginMode === 'student' || loginMode === 'mentor') && (
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                                        <input required type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className={`w-full p-3 pl-12 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${themeColor.ring} transition-shadow`} />
                                    </div>
                                )}
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                                    <input required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className={`w-full p-3 pl-12 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${themeColor.ring} transition-shadow`} />
                                </div>
                                <div className="relative">
                                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                                    <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`w-full p-3 pl-12 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${themeColor.ring} transition-shadow`} />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex items-center justify-center gap-3 mt-6 py-3 px-4 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-70 ${themeColor.bg}`}
                                >
                                    {loading ? <Spinner /> : (isLogin ? 'Login' : 'Create Account')}
                                    
                                </button>
                            </form>

                            {(loginMode === 'student' || loginMode === 'mentor') && (
                                <>
                                    <div className="relative flex py-5 items-center">
                                        <div className="flex-grow border-t border-slate-700"></div>
                                        <span className="flex-shrink mx-4 text-slate-500 text-sm">OR</span>
                                        <div className="flex-grow border-t border-slate-700"></div>
                                    </div>
                                    {isLogin ? (
                                        <>
                                            {loginMode === 'student' && (
                                                <button onClick={() => handleAuthAction('google')} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-700 text-white font-semibold border border-slate-600 rounded-xl shadow-sm hover:bg-slate-600 disabled:bg-slate-800">
                                                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                                    <span>Sign in with Google</span>
                                                </button>
                                            )}
                                            <p className="text-center text-sm text-slate-400 mt-4">
                                                Don't have an account?{' '}
                                                <button type="button" onClick={() => setIsLogin(false)} className={`font-semibold ${themeColor.main === 'cyan' ? 'text-cyan-400' : 'text-green-400'} hover:underline`}>
                                                    {loginMode === 'mentor' ? 'Register here' : 'Sign up'}
                                                </button>
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-center text-sm text-slate-400">
                                            Already have an account?{' '}
                                            <button type="button" onClick={() => setIsLogin(true)} className={`font-semibold ${themeColor.main === 'cyan' ? 'text-cyan-400' : 'text-green-400'} hover:underline`}>
                                                Log in
                                            </button>
                                        </p>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
