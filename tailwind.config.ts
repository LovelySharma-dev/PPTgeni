import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#080d18", panel: "#111a2b", line: "#263650", mint: "#5eead4", violet: "#a78bfa" },
      boxShadow: { glow: "0 0 80px rgba(94,234,212,.12)" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        shimmer: { "0%": { backgroundPosition: "-700px 0" }, "100%": { backgroundPosition: "700px 0" } }
      },
      animation: { float: "float 6s ease-in-out infinite", shimmer: "shimmer 2.5s linear infinite" }
    }
  },
  plugins: []
};

export default config;
