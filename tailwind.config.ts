import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0A0A0B",
          card: "#141416",
        },
        accent: {
          blue: "#3B82F6",
          emerald: "#10B981",
        },
        border: {
          subtle: "rgba(255,255,255,0.05)",
          DEFAULT: "rgba(255,255,255,0.10)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
      },
      boxShadow: {
        card: "0 0 0 1px rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
