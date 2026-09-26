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
        background: "var(--background)",
        foreground: "var(--foreground)",
        ap: {
          bg: "#080808",
          elevated: "#0B0B0B",
          surface: "#101010",
          "surface-2": "#141414",
          "surface-3": "#181818",
          border: "#222222",
          "border-subtle": "#1A1A1A",
          "border-strong": "#2D2D2D",
          text: "#F2F0EA",
          "text-secondary": "#B0ADA5",
          "text-muted": "#716F69",
          "text-dim": "#50504C",
          accent: "#D6A83A",
          "accent-soft": "#8F7028",
          success: "#2FB36F",
          warning: "#D6A83A",
          danger: "#D85C5C",
          info: "#6B8FD6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
