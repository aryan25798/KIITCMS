import React from 'react';

const PendingApproval = ({ status, onLogout }) => {
    const isRejected = status === 'rejected';
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 ${isRejected ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {isRejected ? (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                </div>
                
                <h1 className="text-2xl font-bold text-white mb-2">
                    {isRejected ? 'Account Request Rejected' : 'Verification Pending'}
                </h1>
                
                <p className="text-slate-400 mb-8 leading-relaxed">
                    {isRejected 
                        ? "We're sorry, but your request to join the platform has been declined by the administration."
                        : "Your account is currently under review. Once an administrator approves your request, you will gain access to the dashboard."}
                </p>

                <button 
                    onClick={onLogout}
                    className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-700"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default PendingApproval;