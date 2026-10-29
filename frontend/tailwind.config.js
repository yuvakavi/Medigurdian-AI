/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ---------------------------------------------------------
           Lavender brand palette — the single source of truth for
           the Medigurdian AI visual identity.
           --------------------------------------------------------- */
        lavender: {
          50: '#F7F4FC',
          100: '#F1EBFA',
          200: '#E7E1EF',
          300: '#D6CBE8',
          400: '#B8A9D4',
          500: '#8B7BB5',
          600: '#6F5A98',
          700: '#5C4A80',
          800: '#493B67',
          900: '#382C50',
          950: '#241C36',
        },

        /* Legacy aliases kept so existing components inherit the new
           palette without duplicating colour values. */
        navy: {
          50: '#F7F4FC',
          100: '#F1EBFA',
          200: '#E7E1EF',
          300: '#D6CBE8',
          400: '#B8A9D4',
          500: '#8B7BB5',
          600: '#6F5A98',
          700: '#5C4A80',
          800: '#493B67',
          900: '#382C50',
          950: '#241C36',
        },
        teal: {
          50: '#F4F0FA',
          100: '#EBE4F5',
          200: '#DED4EE',
          300: '#CBBBE5',
          400: '#B09CD6',
          500: '#8B7BB5',
          600: '#6F5A98',
          700: '#5C4A80',
          800: '#493B67',
          900: '#382C50',
          950: '#241C36',
        },

        /* Muted, accessible healthcare status colours. */
        emerald: {
          50: '#F1F8F3',
          100: '#E0F0E5',
          200: '#C4E2CE',
          300: '#9CCCAE',
          400: '#72B188',
          500: '#568F6C',
          600: '#43765A',
          700: '#365F49',
          800: '#2C4D3C',
          900: '#243F32',
        },
        amber: {
          50: '#FDF8EE',
          100: '#FAEED5',
          200: '#F4DDA9',
          300: '#EBC676',
          400: '#DFAC47',
          500: '#C8912E',
          600: '#A87422',
          700: '#875A1D',
          800: '#704A1D',
          900: '#5E3E1B',
        },
        rose: {
          50: '#FDF3F3',
          100: '#FBE3E3',
          200: '#F6C9C9',
          300: '#EFA6A6',
          400: '#E47D7D',
          500: '#D45A5A',
          600: '#B94444',
          700: '#993838',
          800: '#7F3131',
          900: '#6B2C2C',
        },

        /* Theme-aware neutrals driven by CSS variables (see index.css). */
        canvas: 'var(--bg)',
        panel: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
          sunken: 'var(--surface-sunken)',
        },
        hairline: 'var(--border)',
        ink: {
          DEFAULT: 'var(--text)',
          soft: 'var(--text-soft)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(41, 37, 54, 0.04), 0 10px 30px -18px rgba(111, 90, 152, 0.22)',
        'card-hover':
          '0 2px 4px rgba(41, 37, 54, 0.05), 0 18px 38px -20px rgba(111, 90, 152, 0.34)',
        pop: '0 16px 48px -16px rgba(41, 37, 54, 0.28)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out both',
        'slide-up': 'slide-up .25s ease-out both',
        'scale-in': 'scale-in .16s ease-out both',
        'fade-in-right': 'fade-in-right .25s ease-out both',
      },
    },
  },
  plugins: [],
};
