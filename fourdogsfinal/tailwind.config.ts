import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0a0a0f",
          navy: "#0d1117",
          dark: "#161b22",
          card: "#1c2333",
          border: "#2a3140",
          neon: "#00e5a0",
          "neon-dim": "#00c288",
          cyan: "#00d4ff",
          amber: "#ffb800",
          cream: "#f0ece4",
          muted: "#8b949e",
          white: "#e6edf3",
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        body: ['"Montserrat"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
