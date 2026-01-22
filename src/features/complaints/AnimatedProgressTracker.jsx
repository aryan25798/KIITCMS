import React from 'react';
import { CircleDashed, Settings, MessageCircle, PartyPopper } from 'lucide-react';

const AnimatedProgressTracker = ({ status }) => {
    const steps = [
        { name: 'Pending', icon: <CircleDashed size={20} /> },
        { name: 'In Progress', icon: <Settings size={20} /> },
        { name: 'Responded', icon: <MessageCircle size={20} /> },
        { name: 'Resolved', icon: <PartyPopper size={20} /> }
    ];
    const baseStatus = status === 'User Responded' ? 'Responded' : status;
    const currentStepIndex = steps.findIndex(step => step.name === baseStatus);

    const progressPercentage = currentStepIndex >= 0 ? ((currentStepIndex + 0.5) / steps.length) * 100 : 0;

    return (
        <div className="w-full py-4">
            <div className="flex justify-between items-center text-xs text-slate-400 px-2">
                {steps.map(step => <span key={step.name}>{step.name}</span>)}
            </div>
            <div className="relative h-2 bg-slate-700 rounded-full mt-2">
                <div
                    className="absolute top-0 left-0 h-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-purple-400 rounded-full border-2 border-slate-900"></div>
                </div>
            </div>
            {status === 'User Responded' && (
               <p className="text-xs text-orange-400 text-center mt-2">Awaiting admin reply</p>
            )}
        </div>
    );
};

export default AnimatedProgressTracker;