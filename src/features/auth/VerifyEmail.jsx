import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const VerifyEmail = ({ user, onResend, onBackToLogin, resendStatus }) => {
    const [loading, setLoading] = useState(false);

    const handleResend = async () => {
        setLoading(true);
        await onResend();
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-slate-900/50 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-8 text-center"
            >
                <Mail className="w-16 h-16 mx-auto text-cyan-400 bg-cyan-500/10 rounded-full p-3" />
                <h2 className="text-3xl font-bold text-white mt-6">Verify Your Email</h2>
                <p className="text-slate-400 mt-3">
                    A verification link has been sent to <strong className="text-white">{user.email}</strong>.
                    Please click the link in the email to activate your account.
                </p>
                <p className="text-slate-500 text-sm mt-2">You may need to check your spam folder.</p>
                <button
                    onClick={handleResend}
                    disabled={loading}
                    className="w-full mt-8 py-3 px-4 bg-cyan-500 text-white font-semibold rounded-xl hover:bg-cyan-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                >
                    {loading ? <Spinner /> : <Send size={18} />}
                    {loading ? 'Sending...' : 'Resend Verification Email'}
                </button>
                {resendStatus && <p className="text-sm mt-4 text-green-400">{resendStatus}</p>}
                <button
                    onClick={onBackToLogin}
                    className="mt-4 text-sm text-slate-400 hover:text-white hover:underline"
                >
                    Back to Login
                </button>
            </motion.div>
        </div>
    );
};

export default VerifyEmail;