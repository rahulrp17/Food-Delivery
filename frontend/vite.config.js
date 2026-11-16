import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// The API/image proxy is shared by the dev server and the preview server so
// the responsive sweep can run against the production build.
const proxy = {
  "/api": {
    target: "http://localhost:4000",
    changeOrigin: true,
  },
  "/images": {
    target: "http://localhost:4000",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Safe chunking: React, ReactDOM and its scheduler dependency must
        // live in the SAME chunk, and that chunk must not depend on any
        // other chunk. Splitting them by hand (for example sending
        // `scheduler` to a vendor chunk) creates a circular chunk dependency
        // and the production bundle throws "Cannot read properties of
        // undefined (reading 'useLayoutEffect')" because react-dom
        // initialises before React. The dev server never exercises
        // `manualChunks`, so this class of bug only appears in a real build.
        manualChunks: {
          react: ["react", "react-dom", "scheduler"],
          motion: ["motion", "motion/react"],
        },
      },
    },
  },
  server: { proxy },
  preview: { proxy },
});
