import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const token = (name: string) => `hsl(var(--${name}))`;
const pair = (name: string) => ({ DEFAULT: token(name), foreground: token(`${name}-foreground`) });

const config: Config = {
  // `dark` class is toggled by next-themes: "system" on /replan, forced light on the legacy site.
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./contexts/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        background: token("background"),
        foreground: token("foreground"),
        primary: pair("primary"),
        secondary: pair("secondary"),
        destructive: pair("destructive"),
        muted: pair("muted"),
        accent: pair("accent"),
        popover: pair("popover"),
        card: pair("card"),
        sidebar: {
          DEFAULT: token("sidebar"),
          foreground: token("sidebar-foreground"),
          primary: token("sidebar-primary"),
          "primary-foreground": token("sidebar-primary-foreground"),
          accent: token("sidebar-accent"),
          "accent-foreground": token("sidebar-accent-foreground"),
          border: token("sidebar-border"),
          ring: token("sidebar-ring"),
        },
        chart: { "1": token("chart-1"), "2": token("chart-2"), "3": token("chart-3"), "4": token("chart-4"), "5": token("chart-5") },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: { sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": { "0%": { transform: "translateY(10px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
    },
  },
  plugins: [animate],
};

export default config;
