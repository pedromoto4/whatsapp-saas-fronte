/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // WhatsApp-inspired colors
        primary: {
          DEFAULT: '#25D366',
          50: '#E8F8EE',
          100: '#C5EDDA',
          200: '#9DE2C1',
          300: '#75D7A8',
          400: '#4DCC8F',
          500: '#25D366',
          600: '#1FAD54',
          700: '#198742',
          800: '#136130',
          900: '#0D3B1E',
        },
        secondary: {
          DEFAULT: '#128C7E',
          50: '#E6F4F2',
          100: '#BFE3DF',
          200: '#8FD1CA',
          300: '#5FBFB5',
          400: '#39ADA0',
          500: '#128C7E',
          600: '#0F7369',
          700: '#0C5A54',
          800: '#09413F',
          900: '#06282A',
        },
        background: '#0B141A',
        surface: '#111B21',
        card: '#1F2C33',
        border: '#2A373F',
        muted: {
          DEFAULT: '#8696A0',
          foreground: '#8696A0',
        },
        foreground: '#E9EDEF',
        destructive: {
          DEFAULT: '#F15C6D',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

