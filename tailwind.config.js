/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        'apple': '0 4px 24px -6px rgba(0, 0, 0, 0.04), 0 8px 16px -4px rgba(0, 0, 0, 0.02)',
        'apple-hover': '0 12px 32px -8px rgba(0, 0, 0, 0.08), 0 16px 24px -6px rgba(0, 0, 0, 0.04)',
      },
      keyframes: {
        "fade-in": {
          "from": { opacity: "0" },
          "to": { opacity: "1" },
        },
        "zoom-in": {
          "from": { transform: "scale(0.95)", opacity: "0" },
          "to": { transform: "scale(1)", opacity: "1" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(0.8)", opacity: "0" },
          "50%": { transform: "translate(20px, -20px) scale(1)", opacity: "0.03" },
          "100%": { transform: "translate(0px, 0px) scale(0.8)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-in-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        blob: "blob 7s infinite",
      },
    },
  },
  plugins: [],
}
