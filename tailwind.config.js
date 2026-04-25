/** @type {import('tailwindcss').Config} */
module.exports = {
  // 다크모드 비활성 — 라이트 단일 테마 (McKinsey White Paper)
  darkMode: false,
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "npl-primary": {
          DEFAULT: "#1B3A5C",
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          300: "#9FB3C8",
          400: "#6E8FAC",
          500: "#3E6B8A",
          600: "#1B3A5C",
          700: "#142C47",
          800: "#0D1F33",
          900: "#07111E",
        },
        "npl-secondary": {
          DEFAULT: "#2E75B6",
          50: "#EDF4FB",
          100: "#D4E5F5",
          200: "#A9CCEB",
          300: "#7EB2E0",
          400: "#5399D6",
          500: "#2E75B6",
          600: "#255E92",
          700: "#1C476D",
          800: "#133049",
          900: "#0A1924",
        },
        "npl-accent": {
          DEFAULT: "#10B981",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
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
        "surface-elevated": "hsl(var(--npl-surface-elevated))",
        "surface-sunken": "hsl(var(--npl-surface-sunken))",
        "text-primary": "hsl(var(--npl-text-primary))",
        "text-secondary": "hsl(var(--npl-text-secondary))",
        "border-subtle": "hsl(var(--npl-border-subtle))",

        // ─── Semantic Tokens v2 (Sprint 3 · Phase 1-N) ─────────────────────
        // OKLCH 기반. 신규 컴포넌트는 이 토큰 우선 사용.
        // 사용 예: bg-surface-0, text-fg-strong, border-border-subtle
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          inverse: "var(--surface-inverse)",
        },
        fg: {
          strong: "var(--fg-strong)",
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
          inverse: "var(--fg-inverse)",
        },
        brand: {
          DEFAULT: "var(--brand-primary)",
          primary: "var(--brand-primary)",
          "primary-hover": "var(--brand-primary-hover)",
          "primary-active": "var(--brand-primary-active)",
          secondary: "var(--brand-secondary)",
          accent: "var(--brand-accent)",
          "accent-hover": "var(--brand-accent-hover)",
        },
        intent: {
          positive: "var(--intent-positive)",
          warning: "var(--intent-warning)",
          danger: "var(--intent-danger)",
          info: "var(--intent-info)",
        },
      },
      borderColor: {
        subtle: "var(--border-subtle)",
        DEFAULT: "var(--border-default)",
        strong: "var(--border-strong)",
        focus: "var(--border-focus)",
      },
      ringColor: {
        focus: "var(--focus-ring)",
        "focus-strong": "var(--focus-ring-strong)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // 한국어 최적화 letter-spacing (양수값 최소화)
      letterSpacing: {
        tighter:  "-0.02em",
        tight:    "-0.01em",
        snug:     "-0.005em",
        normal:   "0em",
        wide:     "0.02em",   // 기존 Tailwind 0.025em → 한글 공백 방지
        wider:    "0.04em",   // 기존 Tailwind 0.05em
        widest:   "0.06em",   // 기존 Tailwind 0.1em → 한글 음절 분리 방지
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "slide-up": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "success-pulse": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
          "50%": { transform: "scale(1.15)", boxShadow: "0 0 0 8px rgba(16,185,129,0.25)" },
        },
        "error-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.4" },
          "100%": { transform: "scale(50)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s linear infinite",
        "fade-in": "fade-in 0.22s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slide-up 0.22s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scale-in 0.22s cubic-bezier(0.16,1,0.3,1)",
        "success-pulse": "success-pulse 0.4s ease-in-out",
        "error-shake": "error-shake 0.4s ease-in-out",
        float: "float 3s ease-in-out infinite",
        ripple: "ripple 0.6s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
