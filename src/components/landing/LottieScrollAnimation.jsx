import React from "react";
import Lottie from "lottie-react";
import animationData from "../../assets/scroll-animation.json";

const LottieScrollAnimation = () => {
  return (
    <div className="w-full max-w-md mx-auto mb-10">
      <Lottie animationData={animationData} loop autoplay />
    </div>
  );
};

export default LottieScrollAnimation;