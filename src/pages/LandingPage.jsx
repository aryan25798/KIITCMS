import React, { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';

// Assets & Components
import animationData from "../assets/scroll-animation.json";
import VirtualAssistantChatbot from "../features/chat/VirtualAssistantChatbot"; 
import FloatingBotButton from "../components/ui/FloatingBotButton";
import FeatureCard from "../components/ui/FeatureCard";
import { FuturisticCore } from "../components/ui/3D/FuturisticCore";

// Icons
import {
  FaRobot,
  FaShoppingCart,
  FaSearch,
  FaUserGraduate,
  FaSignOutAlt,
  FaBell,
} from "react-icons/fa";
import { ArrowRight, ChevronRight, Star, Menu, X } from "lucide-react";

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
  },
};

const navVariants = {
  hidden: { y: -100, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" }
  },
};

// --- 3D COMPONENTS ---
const ThreeDBackground = () => {
  const ref = useRef();
  // Responsive particle count
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const count = isMobile ? 300 : 800;

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.03;
      // Gentle floating wave effect
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
        <Sparkles
        ref={ref}
        count={count}
        speed={0.4}
        opacity={0.6}
        scale={[30, 30, 30]}
        size={isMobile ? 2.5 : 1.5}
        color="#22d3ee" // Cyan-400
        />
    </group>
  );
};

// --- DATA: FEATURES ---
const features = [
  {
    title: "AI Complaint Assistance",
    desc: "Smart triage system that categorizes and routes student complaints instantly.",
    icon: <FaRobot />,
    color: "cyan",
  },
  {
    title: "Student Marketplace",
    desc: "A secure campus ecosystem to buy, sell, and trade textbooks and gadgets.",
    icon: <FaShoppingCart />,
    color: "fuchsia",
  },
  {
    title: "Lost & Found",
    desc: "AI-powered matching to reunite students with their lost belongings quickly.",
    icon: <FaSearch />,
    color: "pink",
  },
  {
    title: "Mentor Connect",
    desc: "Bridge the gap between seniors and juniors for academic and career guidance.",
    icon: <FaUserGraduate />,
    color: "yellow",
  },
  {
    title: "Digital Leave Pass",
    desc: "Paperless leave applications with real-time approval tracking and logs.",
    icon: <FaSignOutAlt />,
    color: "emerald",
  },
  {
    title: "Instant Alerts",
    desc: "Real-time notifications for urgent campus updates and academic notices.",
    icon: <FaBell />,
    color: "rose",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [isBotChatOpen, setIsBotChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { scrollY } = useScroll();
  
  // Parallax & Scroll Transforms
  const scrollOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);
  
  // Navbar transparency logic
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  return (
    <div className="relative bg-[#0B0F19] text-white font-sans overflow-x-hidden selection:bg-cyan-500/30 min-h-screen">
      
      {/* --- AMBIENT NOISE TEXTURE --- */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.04] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />

      {/* --- BACKGROUND CANVAS --- */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        {/* dpr clamped for mobile performance */}
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 45 }} gl={{ antialias: false }}>
          <Suspense fallback={null}>
            <ThreeDBackground />
          </Suspense>
        </Canvas>
      </div>

      {/* --- AMBIENT GLOWS --- */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-[#0B0F19]/80 to-[#0B0F19]" />
      {/* Responsive Glow Orb */}
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[300px] md:w-[1000px] h-[300px] md:h-[600px] bg-cyan-500/15 blur-[80px] md:blur-[140px] rounded-full pointer-events-none" />

      {/* --- NAVBAR --- */}
      <motion.nav 
        variants={navVariants}
        initial="hidden"
        animate="visible"
        className={`fixed w-full z-50 top-0 transition-all duration-300 ${isScrolled ? 'bg-[#0B0F19]/90 backdrop-blur-md border-b border-white/5 shadow-lg' : 'bg-transparent border-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
              <span className="font-bold text-white text-lg md:text-xl">S</span>
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight text-white">
              Smart<span className="text-cyan-400">Portal</span>
            </span>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate("/login")} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Log In
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 text-sm bg-white text-slate-950 font-bold rounded-full hover:bg-cyan-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-slate-300 hover:text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#0B0F19] border-b border-white/10 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4 flex flex-col items-center">
                <button 
                    onClick={() => navigate("/login")}
                    className="w-full py-3 text-slate-300 hover:text-white font-medium border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                >
                    Log In
                </button>
                <button 
                    onClick={() => navigate("/login")}
                    className="w-full py-3 bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20"
                >
                    Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* --- HERO SECTION --- */}
      <header className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 pt-24 pb-12 overflow-hidden">
        <motion.div 
          style={{ y: heroY }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto flex flex-col items-center relative z-10"
        >
          {/* Announcement Pill */}
          <motion.div variants={itemVariants} className="mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-500/20 backdrop-blur-md text-xs md:text-sm font-medium text-cyan-300 hover:bg-cyan-950/50 hover:border-cyan-500/40 transition-all cursor-default select-none shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>New: AI Assistant 2.0 Live</span>
              <ChevronRight size={14} className="opacity-50" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1 variants={itemVariants} className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter text-white leading-[1.1] mb-6 drop-shadow-2xl">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-pulse-slow">Intelligent</span><br />
            Campus OS
          </motion.h1>
          
          {/* Subheading */}
          <motion.p variants={itemVariants} className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 md:mb-10 px-4">
            A unified, AI-powered platform tailored for the modern student ecosystem. 
            Streamline complaints, mentorship, and campus life in one secure place.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4">
             <button 
               onClick={() => navigate("/login")}
               className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-full transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 group relative overflow-hidden"
             >
               <span className="relative z-10 flex items-center gap-2">
                 Launch Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </span>
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
             </button>
             <button 
               onClick={() => {
                 const el = document.getElementById('features');
                 el?.scrollIntoView({ behavior: 'smooth' });
               }}
               className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-full backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all"
             >
               Explore Features
             </button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          style={{ opacity: scrollOpacity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 opacity-60 pointer-events-none"
        >
          {/* Using a reliable container to prevent layout shift */}
          <div className="w-full h-full">
            <DotLottiePlayer 
                src={animationData} 
                loop 
                autoplay 
                style={{ width: '100%', height: '100%' }} 
            />
          </div>
        </motion.div>
      </header>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-20 md:py-32 px-4 relative z-10 bg-[#0B0F19]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Everything you need</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Powerful tools designed to simplify academic administration and student life.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <FeatureCard feature={feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 3D AI CORE SECTION (Optimized) --- */}
      <section className="relative min-h-[60vh] md:min-h-[80vh] w-full z-10 overflow-hidden border-y border-white/5 bg-gradient-to-b from-[#0B0F19] to-[#020408]">
        <div className="absolute inset-0 z-0">
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 8], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
            <Suspense fallback={null}>
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <FuturisticCore />
                </Float>
            </Suspense>
          </Canvas>
        </div>
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-6 md:p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 text-center shadow-2xl"
          >
            <h3 className="text-4xl sm:text-6xl font-bold text-white tracking-tighter mb-2 drop-shadow-lg">
              Powered by AI
            </h3>
            <p className="text-cyan-400 font-mono text-xs md:text-sm tracking-[0.3em] uppercase">
              Intelligent Automation Core
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-20 md:py-24 px-4 text-center bg-[#020408] relative z-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-white/10 to-transparent p-[1px] rounded-3xl">
          <div className="bg-[#0B0F19] rounded-[23px] py-16 px-6 md:px-12 relative overflow-hidden">
            {/* CTA Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex justify-center mb-6">
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                    <Star className="text-cyan-400 fill-cyan-400/20" size={32} />
                </div>
                </div>
                <h3 className="text-3xl xs:text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to upgrade your campus life?
                </h3>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
                Join thousands of students and faculty using SmartPortal to manage their academic journey effortlessly.
                </p>
                <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="px-10 py-4 bg-white text-slate-950 text-lg font-bold rounded-full shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300"
                >
                Get Started Now
                </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#020408] border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
          <p className="text-center md:text-left">&copy; {new Date().getFullYear()} Smart Portal @ KIIT. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>

      {/* --- FLOATING CHATBOT --- */}
      <FloatingBotButton 
        onClick={() => setIsBotChatOpen(true)} 
        className="bottom-6 right-6 z-50 shadow-2xl shadow-cyan-500/20" 
      />

      {isBotChatOpen && (
        <VirtualAssistantChatbot 
          isOpen={isBotChatOpen} 
          onClose={() => setIsBotChatOpen(false)} 
        />
      )}
    </div>
  );
};

export default LandingPage;