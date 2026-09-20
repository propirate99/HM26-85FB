import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getBackendTarget() {
  if (process.env.VITE_PROXY_TARGET) return process.env.VITE_PROXY_TARGET;
  try {
    const portFile = path.resolve(__dirname, "../.active-port");
    if (fs.existsSync(portFile)) {
      const p = fs.readFileSync(portFile, "utf-8").trim();
      if (p) return `http://localhost:${p}`;
    }
  } catch {}
  return "http://localhost:5050";
}

function geojsonPlugin() {
  return {
    name: "geojson-loader",
    transform(code, id) {
      if (id.endsWith(".geojson")) {
        return {
          code: `export default ${code};`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), geojsonPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
        router: () => getBackendTarget(),
      },
      "/uploads": {
        target: "http://localhost:5050",
        changeOrigin: true,
        router: () => getBackendTarget(),
      },
    },
  },
});
