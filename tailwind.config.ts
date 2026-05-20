import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
        ink: {
          900: "#0b1220",
          800: "#111827",
          700: "#1f2937",
          600: "#374151",
          400: "#9ca3af",
          200: "#e5e7eb",
          100: "#f3f4f6",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "Segoe UI", "Roboto"],
      },
    },
  },
  plugins: [],
};
export default config;
