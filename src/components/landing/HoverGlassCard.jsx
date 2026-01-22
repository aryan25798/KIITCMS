import React from "react";

const HoverGlassCard = ({ title, icon, description }) => {
  return (
    <div className="backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 transition-transform transform hover:scale-105 hover:bg-white/20">
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-300">{description}</p>
    </div>
  );
};

export default HoverGlassCard;