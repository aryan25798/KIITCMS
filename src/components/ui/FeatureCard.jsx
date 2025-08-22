// src/components/ui/FeatureCard.jsx
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

const FeatureCard = ({ feature }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

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
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-xs xs:max-w-sm h-64 xs:h-80 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col items-center justify-center p-6 xs:p-8 group transition-all duration-300 hover:shadow-lg hover:scale-105`}
    >
      <div className={`text-5xl xs:text-6xl text-${feature.color}-400 drop-shadow-glow mb-4 xs:mb-6`}>
        {feature.icon}
      </div>
      <h3 className="text-xl xs:text-2xl font-bold text-white mb-1 xs:mb-2">{feature.title}</h3>
      <p className="text-gray-400 text-center text-xs xs:text-sm">{feature.desc}</p>
    </motion.div>
  );
};

export default FeatureCard;
