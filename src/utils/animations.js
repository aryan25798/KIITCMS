import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const setupScrollAnimations = () => {
  gsap.from(".hero-title", {
    scrollTrigger: {
      trigger: ".hero-title",
      start: "top 80%",
    },
    y: 100,
    opacity: 0,
    duration: 1,
    ease: "power4.out",
  });

  gsap.from(".hero-subtitle", {
    scrollTrigger: {
      trigger: ".hero-subtitle",
      start: "top 90%",
    },
    y: 50,
    opacity: 0,
    delay: 0.3,
    duration: 1,
    ease: "power2.out",
  });

  gsap.from(".feature-card", {
    scrollTrigger: {
      trigger: ".feature-card",
      start: "top 85%",
    },
    stagger: 0.3,
    y: 50,
    opacity: 0,
    duration: 1,
    ease: "expo.out",
  });
};
