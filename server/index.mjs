import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { handleMapBsSearch, isMapBsSearchPath } from "./mapbsProxy.mjs";

const root = path.resolve(process.env.BUILD_DIR || "/app/build");
const port = Number(process.env.PORT || 8020);
const apiKey = process.env.API_KEY_MAPBS || "";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pbf": "application/x-protobuf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
};

function resolveStatic(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  rel = rel.replace(/^\/+/, "");
  if (rel.includes("\0")) return null;
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function sendFile(res, filePath) {
  const type = types[path.extname(filePath)] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("content-type", type);
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (isMapBsSearchPath(url.pathname)) {
    await handleMapBsSearch(req, res, apiKey);
    return;
  }

  const resolved = resolveStatic(url.pathname);
  if (!resolved) {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }

  let filePath = resolved;
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    if (!fs.statSync(filePath).isFile()) throw new Error("not a file");
  } catch {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`listening on ${port}`);
});
