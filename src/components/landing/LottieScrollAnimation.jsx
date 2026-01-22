import React from "react";
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css'; 
// Note: You might need to convert your JSON to .lottie for max speed, 
// but dotlottie player handles JSON too.
import animationData from "../../assets/scroll-animation.json";

const LottieScrollAnimation = () => {
  return (
    <div className="w-full max-w-md mx-auto mb-10">
      <DotLottiePlayer
        src={animationData}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default LottieScrollAnimation;