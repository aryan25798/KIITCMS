/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // ✅ Safelist: Updated for subtler, more professional border accents
  safelist: [
    'border-cyan-500/20', 'text-cyan-400',
    'border-fuchsia-500/20', 'text-fuchsia-400',
    'border-pink-500/20', 'text-pink-400',
    'border-yellow-500/20', 'text-yellow-400',
    'border-emerald-500/20', 'text-emerald-400',
    'border-rose-500/20', 'text-rose-400',
  ],

  theme: {
    extend: {
      screens: {
        xs: '480px', // Useful for very small mobile adjustments
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Professional font stack
      },
      // ✅ Professional Animations
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
      },
      // ✅ Custom Keyframes
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },

  // ✅ Custom Utilities for Glassmorphism & Polish
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.glass-panel': {
          background: 'rgba(15, 23, 42, 0.6)', // Deep slate with opacity
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
        '.text-glow': {
          textShadow: '0 0 20px rgba(56, 189, 248, 0.3)', // Subtle premium glow
        },
        // Redefining drop-shadow to be less harsh than before
        '.drop-shadow-glow': {
          filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.3))',
        },
      });
    },
  ],
}