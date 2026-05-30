/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dbe6ff",
          200: "#b9cdff",
          500: "#2f55d4",
          600: "#243f99",
          700: "#1f367f",
          900: "#162555",
        },
      },
    },
  },
  plugins: [],
};
