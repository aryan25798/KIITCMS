import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const FloatingBotButton = ({ onClick, className = "bottom-6 right-6" }) => {
  return (
    <div className={`fixed ${className} z-50 pointer-events-none`}>
      {/* pointer-events-none on wrapper ensures the fixed div doesn't block clicks 
         around the button area. We re-enable pointer-events on the button itself.
      */}

      {/* Tooltip (Desktop Only) - Anchored relative to the button group */}
      <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap hidden md:block">
        Ask AI Assistant
      </div>

      <motion.button 
        onClick={onClick}
        
        // --- DRAG FUNCTIONALITY ---
        drag
        dragConstraints={{ left: -window.innerWidth + 50, right: 0, top: -window.innerHeight + 50, bottom: 0 }}
        dragElastic={0.1} // Adds a premium "weight" to the drag
        dragMomentum={false} // Prevents it from sliding uncontrollably
        whileDrag={{ cursor: 'grabbing', scale: 1.1 }}
        
        // --- FLOATING ANIMATION ---
        animate={{ 
          y: [0, -8, 0], // Subtle bobbing effect
        }}
        transition={{ 
          y: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}

        // --- INTERACTION ---
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}

        className="pointer-events-auto group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-[#0F172A] hover:bg-[#1E293B] border border-white/10 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-grab active:cursor-grabbing hover:border-cyan-500/30 group-hover:shadow-cyan-500/20"
        aria-label="Open AI Assistant"
      >
        {/* Inner Gradient for subtle depth */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Professional Iconography */}
        <div className="relative z-10 pointer-events-none">
            <Sparkles 
                strokeWidth={1.5} 
                className="w-5 h-5 md:w-6 md:h-6 text-cyan-400 transition-transform duration-500 group-hover:rotate-12" 
            />
        </div>

        {/* Status Dot (Static, clean) */}
        <div className="absolute top-3 right-3.5 w-2 h-2 bg-green-500 rounded-full border-2 border-[#0F172A] pointer-events-none"></div>
      </motion.button>
    </div>
  );
};

export default FloatingBotButton;