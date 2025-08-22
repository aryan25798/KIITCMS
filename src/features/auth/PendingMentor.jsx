import React from 'react';

const PendingMentor = ({ onLogout }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-center p-4">
            <div>
                <h1 className="text-3xl font-bold text-white">Application Pending</h1>
                <p className="text-slate-400 mt-2">
                    Your mentor application is currently under review by the administration. <br /> You will be able to log in once it has been approved.
                </p>
                <button onClick={onLogout} className="mt-8 px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default PendingMentor;