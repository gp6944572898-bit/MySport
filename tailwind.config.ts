import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf5",
          100: "#d6f7e4",
          200: "#b0edcd",
          300: "#7ddcb0",
          400: "#45c38e",
          500: "#1fa873",
          600: "#13875d",
          700: "#126c4c",
          800: "#13563e",
          900: "#114835",
          950: "#06281d",
        },
        ink: {
          50: "#f5f6f8",
          100: "#e7e9ee",
          200: "#cbd0db",
          300: "#a1a9bd",
          400: "#717c98",
          500: "#52607c",
          600: "#404b64",
          700: "#353e52",
          800: "#2e3546",
          900: "#1b1f2a",
          950: "#101319",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config
