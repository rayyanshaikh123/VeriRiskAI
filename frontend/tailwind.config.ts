import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
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
        foreground: "var(--foreground)",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(11, 28, 48, 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
