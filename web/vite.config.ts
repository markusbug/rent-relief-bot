import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // bankr.x402.json lives one level up and is the single source of prices/enums.
    fs: { allow: [".."] },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
