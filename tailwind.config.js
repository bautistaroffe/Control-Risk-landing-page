/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        "background-light": "var(--color-background-light)",
        "background-dark": "var(--color-background-dark)",
        "neutral-dark": "var(--color-neutral-dark)",
        "card-dark": "var(--color-card-dark)",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
