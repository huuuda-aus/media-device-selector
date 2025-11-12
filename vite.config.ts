import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    root: isDev ? "demo" : ".",
    base: isDev ? "/" : "/dist/",
    publicDir: "public",
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      fs: {
        strict: true,
      },
    },
    build: {
      outDir: isDev ? "dist" : "dist",
      lib: isDev
        ? undefined
        : {
            entry: resolve(__dirname, "src/index.ts"),
            name: "MediaDeviceSelector",
            fileName: (format: string) => `media-device-selector.${format}.js`,
          },
      rollupOptions: isDev
        ? {
            input: "demo/index.html",
            output: {
              entryFileNames: "assets/[name].js",
              chunkFileNames: "assets/[name].js",
              assetFileNames: "assets/[name].[ext]",
            },
          }
        : {
            external: ["react", "react-dom"],
            output: {
              globals: {
                react: "React",
                "react-dom": "ReactDOM",
              },
            },
          },
    },
  };
});
