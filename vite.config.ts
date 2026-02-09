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
    alias: [
      {
        find: /^react$/,
        replacement: path.resolve(import.meta.dirname, "node_modules", "react", "index.js"),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.resolve(
          import.meta.dirname,
          "node_modules",
          "react",
          "jsx-runtime.js"
        ),
      },
      {
        find: /^react-dom$/,
        replacement: path.resolve(import.meta.dirname, "node_modules", "react-dom", "index.js"),
      },
      {
        find: /^react-dom\/client$/,
        replacement: path.resolve(
          import.meta.dirname,
          "node_modules",
          "react-dom",
          "client.js"
        ),
      },
      { find: "@", replacement: path.resolve(import.meta.dirname, "client", "src") },
      { find: "@shared", replacement: path.resolve(import.meta.dirname, "shared") },
      { find: "@assets", replacement: path.resolve(import.meta.dirname, "attached_assets") },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
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
