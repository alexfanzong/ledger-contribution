import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201a",
        muted: "#66736b",
        line: "#dce3dd",
        panel: "#f7faf8",
        accent: "#1f7a5a"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(23, 32, 26, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
