import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

const analyze = process.env.ANALYZE === "true";
const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  analyze &&
    visualizer({
      filename: "dist/bundle-report.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: true,
    }),
].filter(Boolean);

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/react/") || id.includes("/react-dom/")) {
            return "react";
          }
          if (id.includes("/@radix-ui/")) {
            return "radix";
          }
          if (id.includes("/recharts/") || id.includes("/d3-")) {
            return "charts";
          }
          if (id.includes("/framer-motion/")) {
            return "motion";
          }
          if (id.includes("/@aws-sdk/")) {
            return "aws-sdk";
          }
          if (id.includes("/@supabase/")) {
            return "supabase";
          }
          if (id.includes("/date-fns/")) {
            return "date-fns";
          }
          if (id.includes("/zod/")) {
            return "zod";
          }
          if (id.includes("/@tanstack/")) {
            return "tanstack";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
