import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const ParallaxSection = ({ image, title, subtitle }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <motion.section
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed", // This creates the parallax effect
        y,
      }}
      className="relative h-screen flex flex-col justify-center items-center text-center"
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 p-10 rounded-xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">{title}</h1>
        <p className="text-xl text-gray-300">{subtitle}</p>
      </div>
    </motion.section>
  );
};

export default ParallaxSection;