import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        crypto: {
          dark: "#0b0e14",
          card: "#121721",
          border: "#1e2638",
          muted: "#64748b",
          up: "#10b981",
          down: "#f43f5e",
        }
      },
    },
  },
  plugins: [],
};

export default config;
