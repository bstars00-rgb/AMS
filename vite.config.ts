import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "/AMS/" matches the GitHub Pages project site:
//   https://bstars00-rgb.github.io/AMS/
// Combined with HashRouter (see src/main.tsx), deep links keep working on
// refresh with no server-side rewrites.
export default defineConfig({
  plugins: [react()],
  base: "/AMS/",
  server: { port: 5173 },
});
