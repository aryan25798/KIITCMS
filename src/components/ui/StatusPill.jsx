import React from 'react';

const StatusPill = ({ status }) => {
    const colors = {
        'Pending': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
        'In Progress': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        'Responded': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        'User Responded': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
        'Resolved': 'bg-green-500/10 text-green-400 border border-green-500/20',
        'Re-opened': 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
        'Approved': 'bg-green-500/10 text-green-400 border border-green-500/20',
        'Rejected': 'bg-red-500/10 text-red-400 border border-red-500/20',
        // Lost & Found Statuses
        'Lost': 'bg-red-500/10 text-red-400 border border-red-500/20',
        'Found': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        'Claimed': 'bg-green-500/10 text-green-400 border border-green-500/20',
        // Marketplace Statuses
        'Available': 'bg-green-500/10 text-green-400 border border-green-500/20',
        'Sold': 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    };

    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-slate-700 text-slate-300'}`}>{status}</span>;
};

export default StatusPill;