/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  future: {
    // Fix mobile double-tap: hover states only on devices with hover capability
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // Custom animations for 2026 UX
      animation: {
        // Fade in animations
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.5s ease-out forwards',
        'fade-in-left': 'fadeInLeft 0.5s ease-out forwards',
        'fade-in-right': 'fadeInRight 0.5s ease-out forwards',

        // Scale animations
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',

        // Shimmer for loading states
        'shimmer': 'shimmer 2s infinite linear',

        // Pulse variations
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',

        // Progress bar fill
        'progress-fill': 'progressFill 1s ease-out forwards',

        // Number count up
        'count-up': 'countUp 0.5s ease-out forwards',

        // Celebration animations
        'confetti-fall': 'confettiFall 3s ease-out forwards',
        'sparkle': 'sparkle 0.6s ease-out forwards',

        // Hover lift
        'lift': 'lift 0.3s ease-out forwards',

        // Slide animations
        'slide-in-bottom': 'slideInBottom 0.4s ease-out forwards',
        'slide-in-top': 'slideInTop 0.4s ease-out forwards',
        'slide-out-bottom': 'slideOutBottom 0.3s ease-in forwards',

        // Wiggle for attention
        'wiggle': 'wiggle 0.5s ease-in-out',

        // Spin slow
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        // Fade in
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInLeft: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        fadeInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },

        // Scale
        scaleIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        bounceIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.3)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
          '70%': {
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },

        // Shimmer
        shimmer: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },

        // Pulse variations
        pulseSubtle: {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.7',
          },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 20px 10px rgba(239, 68, 68, 0)',
          },
        },

        // Progress fill
        progressFill: {
          '0%': {
            width: '0%',
          },
          '100%': {
            width: 'var(--progress-width, 100%)',
          },
        },

        // Count up
        countUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        // Confetti
        confettiFall: {
          '0%': {
            transform: 'translateY(-100vh) rotate(0deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(100vh) rotate(720deg)',
            opacity: '0',
          },
        },

        // Sparkle
        sparkle: {
          '0%': {
            transform: 'scale(0) rotate(0deg)',
            opacity: '1',
          },
          '50%': {
            transform: 'scale(1) rotate(180deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'scale(0) rotate(360deg)',
            opacity: '0',
          },
        },

        // Lift
        lift: {
          '0%': {
            transform: 'translateY(0)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          '100%': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          },
        },

        // Slide animations
        slideInBottom: {
          '0%': {
            opacity: '0',
            transform: 'translateY(100%)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInTop: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-100%)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideOutBottom: {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(100%)',
          },
        },

        // Wiggle
        wiggle: {
          '0%, 100%': {
            transform: 'rotate(-3deg)',
          },
          '50%': {
            transform: 'rotate(3deg)',
          },
        },
      },

      // Custom transition timing functions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'snappy': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // Custom transition durations
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
        '1500': '1500ms',
        '2000': '2000ms',
      },
    },
  },
  plugins: [],
};
