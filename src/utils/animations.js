// src/utils/animations.js

/**
 * DEPRECATED: This file previously handled GSAP animations.
 * We have moved all animations to Framer Motion directly inside the components
 * (e.g., LandingPage.jsx) to improve performance and reduce bundle size.
 * * You can safely delete this file once you confirm no other files import it.
 */

export const setupScrollAnimations = () => {
  // No-op: Animations are now handled by Framer Motion in the JSX.
  console.log("Animations initialized via Framer Motion.");
};