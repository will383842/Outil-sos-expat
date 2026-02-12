/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        telegram: {
          50: "#e6f4fb",
          100: "#b3dff4",
          200: "#80caed",
          300: "#4db5e6",
          400: "#1aa0df",
          500: "#0088cc",
          600: "#006da3",
          700: "#00527a",
          800: "#003752",
          900: "#001c29",
        },
      },
    },
  },
  plugins: [],
};
