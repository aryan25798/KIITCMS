import React, { useState, Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, OrbitControls } from "@react-three/drei";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import animationData from "../assets/scroll-animation.json";
import VirtualAssistantChatbot from "../features/chat/VirtualAssistantChatbot"; // Updated import path

import {
  FaRobot,
  FaShoppingCart,
  FaSearch,
  FaUserGraduate,
  FaSignOutAlt,
  FaBell,
} from "react-icons/fa";

import FeatureCard from "../components/ui/FeatureCard";
import FloatingBotButton from "../components/ui/FloatingBotButton";
import { FuturisticCore } from "../components/ui/3D/FuturisticCore";

// Neon glow text style
const neonGlow = {
  textShadow:
    "0 0 8px rgba(0, 255, 255, 0.6), 0 0 16px rgba(255, 0, 255, 0.4)",
};

// 3D Background with Sparkles
const ThreeDBackground = () => {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03; // Slow rotation
    }
  });

  return (
    <>
      <Sparkles
        ref={ref}
        count={2000}
        speed={0.4}
        opacity={0.8}
        scale={[50, 50, 50]}
        color="cyan"
      />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </>
  );
};

// Features Array
const features = [
  {
    title: "AI Complaint Assistance",
    desc: "Automatically categorize and route complaints using Gemini AI.",
    icon: <FaRobot />,
    color: "cyan",
  },
  {
    title: "Student Marketplace",
    desc: "Buy and sell textbooks, electronics, and more within campus.",
    icon: <FaShoppingCart />,
    color: "fuchsia",
  },
  {
    title: "Lost & Found",
    desc: "Report lost items or return found belongings with ease.",
    icon: <FaSearch />,
    color: "pink",
  },
  {
    title: "Mentor Program",
    desc: "Connect with mentors and alumni for career guidance.",
    icon: <FaUserGraduate />,
    color: "yellow",
  },
  {
    title: "Leave Application",
    desc: "Submit leave requests and track approval status.",
    icon: <FaSignOutAlt />,
    color: "emerald",
  },
  {
    title: "Live Notifications",
    desc: "Stay updated with instant notifications.",
    icon: <FaBell />,
    color: "rose",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [isBotChatOpen, setIsBotChatOpen] = useState(false);

  return (
    <div className="relative bg-black text-white font-sans overflow-x-hidden">
      {/* Starry 3D Background */}
      <div className="fixed inset-0 -z-20">
        <Canvas>
          <Suspense fallback={null}>
            <ThreeDBackground />
          </Suspense>
        </Canvas>
      </div>

      {/* Gradient Overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/50 via-slate-900/80 to-black/50" />

      {/* Navbar */}
      <nav className="flex justify-between items-center px-4 xs:px-6 sm:px-8 md:px-16 py-4 xs:py-6 fixed w-full z-50 backdrop-blur-lg bg-black/30 border-b border-white/10 shadow-md">
        <h1
          className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text"
          style={neonGlow}
        >
          Smart<span className="text-white">Portal</span>
        </h1>
        <div className="space-x-2 sm:space-x-4">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-xs sm:text-sm border border-cyan-400 text-cyan-400 rounded-full hover:bg-cyan-400 hover:text-black transition-all duration-300"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold rounded-full hover:opacity-90 transition-all duration-300"
          >
            Signup
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 pt-32 xs:pt-40 relative z-10">
        <motion.h2
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-4xl xs:text-5xl sm:text-6xl md:text-8xl font-extrabold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent tracking-tight"
          style={neonGlow}
        >
          KIIT Smart Campus
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true }}
          className="text-sm xs:text-base sm:text-lg mt-6 max-w-2xl text-gray-300"
        >
          Blazing fast, AI-powered portal for complaints, marketplace, lost &
          found, mentorship, and beyond. Experience the future now.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          viewport={{ once: true }}
          className="w-40 h-40 xs:w-52 xs:h-52 sm:w-64 sm:h-64 mt-8"
        >
          <Lottie animationData={animationData} loop />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16 xs:py-24 sm:py-32 px-4 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-16 place-items-center">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <FeatureCard feature={feature} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3D AI Core */}
      <section className="h-screen w-full relative z-10">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} color="#f0f" intensity={0.5} />
          <Suspense fallback={null}>
            <FuturisticCore />
          </Suspense>
        </Canvas>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <h3
            className="text-4xl sm:text-5xl font-bold text-center text-white"
            style={neonGlow}
          >
            Powered by AI
          </h3>
          <p className="text-gray-400 mt-2">
            Intelligent automation at its core.
          </p>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-16 xs:py-24 sm:py-32 text-center bg-gradient-to-br from-[#0f172a]/50 to-[#1e293b]/50 relative z-10 border-t border-white/10 backdrop-blur-sm">
        <motion.h3
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-3xl xs:text-4xl sm:text-5xl font-bold text-white px-4"
          style={neonGlow}
        >
          Join the Movement. Upgrade Your Campus Experience.
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-gray-400 mt-4 mb-8 text-base xs:text-lg px-4"
        >
          Sign up now and feel the future of student services in action.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          onClick={() => navigate("/login")}
          className="px-8 xs:px-10 sm:px-12 py-2 xs:py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-sm xs:text-base sm:text-lg font-semibold rounded-full hover:scale-105 hover:shadow-xl transition-all duration-300"
        >
          Get Started
        </motion.button>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-gray-500 text-sm border-t border-white/10">
        &copy; {new Date().getFullYear()} Smart Portal @ KIIT. All rights reserved.
      </footer>

      {/* Floating Chatbot */}
      <FloatingBotButton onClick={() => setIsBotChatOpen(true)} />

      {/* Render chatbot modal conditionally */}
      {isBotChatOpen && <VirtualAssistantChatbot isOpen={isBotChatOpen} onClose={() => setIsBotChatOpen(false)} />}
    </div>
  );
};

export default LandingPage;
