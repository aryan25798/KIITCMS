// src/components/ui/FeatureCard.jsx
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

const FeatureCard = ({ feature }) => {
  // --- 1. PRESERVED FUNCTIONALITY: 3D Tilt Logic ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Adjusted spring physics for a more "premium" weighted feel (less jittery)
  const mouseXSpring = useSpring(x, { stiffness: 250, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 250, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  // New: Dynamic sheen effect moving opposite to the tilt for realism
  const sheenX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const sheenY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ 
        rotateX, 
        rotateY, 
        transformStyle: "preserve-3d",
        perspective: 1200 
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-xs xs:max-w-sm h-[20rem] xs:h-[22rem] group"
    >
      {/* --- 2. GLASS CONTAINER --- */}
      <div 
        className="absolute inset-0 rounded-[2rem] bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 group-hover:border-white/20 group-hover:shadow-cyan-500/10 overflow-hidden"
        style={{ transform: "translateZ(0px)" }} 
      >
        {/* Subtle Gradient Background */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-${feature.color}-500/40 to-transparent`} />
        
        {/* Dynamic Sheen/Reflection */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
          style={{ 
            background: "radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, transparent 70%)",
            backgroundPositionX: sheenX,
            backgroundPositionY: sheenY,
          }}
        />

        {/* --- 3. CONTENT LAYER (Elevated via 3D) --- */}
        <div className="flex flex-col items-center justify-center h-full p-6 xs:p-8 text-center" style={{ transform: "translateZ(60px)" }}>
          
          {/* Modern Icon Pill */}
          <div className={`
            mb-6 p-4 rounded-2xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 
            text-${feature.color}-400 text-4xl xs:text-5xl shadow-lg 
            group-hover:scale-110 group-hover:bg-${feature.color}-500/20 group-hover:shadow-${feature.color}-500/30
            transition-all duration-300 flex items-center justify-center
          `}>
            {feature.icon}
          </div>

          <h3 className="text-xl xs:text-2xl font-bold text-white mb-3 tracking-tight group-hover:text-cyan-300 transition-colors">
            {feature.title}
          </h3>
          
          <p className="text-slate-400 text-xs xs:text-sm font-medium leading-relaxed max-w-[95%]">
            {feature.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default FeatureCard;