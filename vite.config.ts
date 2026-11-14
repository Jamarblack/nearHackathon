import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Serves /api/settle during `pnpm dev` with the same file Vercel runs in production.
const devApi = (): Plugin => ({
  name: "dev-api",
  configureServer(server) {
    Object.assign(process.env, loadEnv("development", process.cwd(), ""));
    server.middlewares.use("/api/settle", (req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        const mod = await server.ssrLoadModule("/api/settle.ts");
        const r = {
          status(n: number) { res.statusCode = n; return r; },
          json(o: unknown) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); },
        };
        await mod.default({ method: req.method, body }, r);
      });
    });
  },
});

export default defineConfig({ plugins: [react(), tailwindcss(), devApi()] });
