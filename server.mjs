// Preview server for dist/. `node server.mjs` then open http://localhost:4322
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  let file = join(dist, path);
  try {
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(301, { Location: path + "/" }); return res.end(); }
  } catch {
    file = join(dist, "404", "index.html");
    res.statusCode = 404;
  }
  try {
    const body = await readFile(file);
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.statusCode = 404; res.end("Not found");
  }
}).listen(4322, "127.0.0.1", () => console.log("Preview: http://localhost:4322"));
