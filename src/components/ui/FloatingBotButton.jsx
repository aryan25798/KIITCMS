// src/components/ui/FloatingBotButton.jsx
import React from 'react';
import { FaRobot } from "react-icons/fa";

const FloatingBotButton = ({ onClick }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button 
        onClick={onClick}
        className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-3 rounded-full text-black font-bold hover:scale-105 transition-all shadow-md"
      >
        <FaRobot className="inline mr-2" /> Chat with AI
      </button>
    </div>
  );
};

export default FloatingBotButton;
