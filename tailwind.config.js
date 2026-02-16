/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#1111d4",
        "secondary": "#0ea5e9",
        "background-light": "#f6f6f8",
        "background-dark": "#101022",
        "alert": "#ef4444",
        "success": "#10b981",
        "warning": "#f59e0b",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
    },
  },
  plugins: [],
}
