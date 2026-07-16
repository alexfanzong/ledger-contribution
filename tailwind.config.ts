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
        ink: "#0a1a35",
        muted: "#647087",
        line: "#e4e1dc",
        panel: "#f7f6f3",
        accent: "#6d0f5b",
        ledger: {
          canvas: "#fcfaf7",
          ink: "#0a1a35",
          muted: "#647087",
          line: "#e4e1dc",
          panel: "#f7f6f3"
        },
        plum: {
          100: "#f5e6f1",
          400: "#bd7fab",
          600: "#8b246f",
          700: "#76105f",
          800: "#65084f",
          900: "#50063f",
          950: "#320127"
        },
        periwinkle: {
          100: "#eeedff"
        }
      },
      boxShadow: {
        soft: "0 8px 24px rgba(10, 26, 53, 0.08)",
        evidence: "0 18px 45px rgba(10, 26, 53, 0.09)"
      }
    }
  },
  plugins: []
};

export default config;
