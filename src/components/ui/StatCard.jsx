import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, colorClass, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: delay * 0.1 }}
        className={`relative overflow-hidden flex items-center p-5 bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-700/50 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10`}>
        <div className={`absolute -top-4 -right-4 w-24 h-24 ${colorClass} opacity-10 rounded-full blur-2xl`}></div>
        <div className={`flex-shrink-0 p-4 rounded-full bg-slate-700/50 border border-slate-600`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </motion.div>
);

export default StatCard;