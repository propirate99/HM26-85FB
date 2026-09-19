import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
      "/api": process.env.VITE_PROXY_TARGET || "http://localhost:5000",
      "/uploads": process.env.VITE_PROXY_TARGET || "http://localhost:5000",
    },
  },
});
