/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // ✅ Safelist dynamic colors used in cards & icons
  safelist: [
    'border-cyan-400/50', 'text-cyan-400',
    'border-fuchsia-400/50', 'text-fuchsia-400',
    'border-pink-400/50', 'text-pink-500',
    'border-yellow-400/50', 'text-yellow-300',
    'border-emerald-400/50', 'text-emerald-400',
    'border-rose-400/50', 'text-rose-400',
  ],

  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      // ✅ Custom Animations
      animation: {
        'gradient-blur': 'gradient-blur 15s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
      },

      // ✅ Custom Keyframes
      keyframes: {
        'gradient-blur': {
          '0%, 100%': {
            filter: 'blur(10px) brightness(1)',
          },
          '50%': {
            filter: 'blur(40px) brightness(1.2)',
          },
        },
      },
    },
  },

  // ✅ Custom Utilities
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.drop-shadow-glow': {
          filter: 'drop-shadow(0 0 15px rgba(100, 180, 255, 0.6))',
        },
        '.neon-text': {
          textShadow: `
            0 0 5px rgba(255, 255, 255, 0.8),
            0 0 10px rgba(255, 255, 255, 0.6),
            0 0 15px rgba(59, 130, 246, 0.5),
            0 0 20px rgba(59, 130, 246, 0.5)
          `,
        },
      });
    },
  ],
}
