/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        onSurface: "var(--on-surface)",
        "on-surface": "var(--on-surface)",
        border: "var(--border)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(11, 28, 48, 0.08)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
