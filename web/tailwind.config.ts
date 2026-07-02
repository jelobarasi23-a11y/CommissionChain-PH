import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1240px" },
    },
    extend: {
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // direct brand tokens
        night:          "hsl(var(--night))",
        surface:        "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))",
        "signal-teal":  "hsl(var(--primary))",
        "peso-gold":    "hsl(var(--gold))",
        rust:           "hsl(var(--coral))",
        ink:            "hsl(var(--night))",
        paper:          "hsl(var(--surface))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans:    ["var(--font-body)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        ledger:  "0 1px 3px 0 rgba(0,0,0,0.4), 0 0 0 1px hsl(var(--edge))",
        card:    "0 4px 24px -4px rgba(0,0,0,0.5), 0 0 0 1px hsl(var(--edge))",
        glow:    "0 0 20px 2px hsl(162 100% 41% / 0.3)",
        "glow-gold": "0 0 20px 2px hsl(38 95% 55% / 0.3)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, hsl(162 100% 41%), hsl(162 80% 55%))",
        "gradient-gold":    "linear-gradient(135deg, hsl(38 95% 55%), hsl(38 95% 68%))",
        "gradient-card":    "linear-gradient(145deg, hsl(226 32% 14%), hsl(226 32% 11%))",
        "gradient-hero":    "linear-gradient(135deg, hsl(162 100% 41% / 0.08) 0%, transparent 50%, hsl(38 95% 55% / 0.05) 100%)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
