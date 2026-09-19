// Local dev server for the x402 handlers. No payment layer, no auth.
//   node --experimental-strip-types scripts/dev.mjs
// Then: curl -X POST localhost:8787/rent-letter -d '{...}'
import { createServer } from "node:http";
import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "x402");
const handlers = {};
for (const name of readdirSync(root)) {
  const mod = await import(pathToFileURL(join(root, name, "index.ts")).href);
  handlers[name] = mod.default;
}
const port = Number(process.env.PORT ?? 8787);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  const name = url.pathname.split("/")[1];
  const handler = handlers[name];
  if (!handler) {
    res.writeHead(404, { "content-type": "application/json", ...CORS });
    return res.end(JSON.stringify({ error: "unknown service", services: Object.keys(handlers) }));
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });
  try {
    const out = await handler(request);
    res.writeHead(out.status, { ...Object.fromEntries(out.headers), ...CORS });
    res.end(Buffer.from(await out.arrayBuffer()));
  } catch (err) {
    res.writeHead(500, { "content-type": "application/json", ...CORS });
    res.end(JSON.stringify({ error: String(err) }));
  }
}).listen(port, () => console.log(`dev server on http://localhost:${port}  services: ${Object.keys(handlers).join(", ")}`));
