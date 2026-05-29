/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: "#060b18",
          secondary: "#0a1120",
          card: "rgba(14, 22, 42, 0.90)",
          glass: "rgba(255, 255, 255, 0.05)",
        },
        text: {
          primary: "#f0f6ff",
          secondary: "#8fa3bf",
          muted: "#4a6080",
        },
        aspis: {
          blue: "#3b82f6",
          academic: "#6366f1",
          behavioral: "#8b5cf6",
          sports: "#10b981",
          health: "#f43f5e",
        },
        risk: {
          low: "#10b981",
          medium: "#f59e0b",
          high: "#f97316",
          critical: "#f43f5e",
        }
      },
      borderRadius: {
        lg: "22px",
        md: "16px",
        sm: "10px",
      },
      boxShadow: {
        card: "0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35)",
        glow: "0 0 48px rgba(59, 130, 246, 0.18)",
      }
    },
  },
  plugins: [],
}
