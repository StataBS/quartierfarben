/** Same-origin search proxy. The MapBS key stays in this process. */

export const MAPBS_SEARCH_PATH = "/api/mapbs-search";
const UPSTREAM = "https://api.geo.bs.ch/search/v2/search";
const MAX_TERM_LENGTH = 200;

export function isMapBsSearchPath(pathname) {
  return pathname === MAPBS_SEARCH_PATH || pathname.endsWith(MAPBS_SEARCH_PATH);
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} apiKey
 */
export async function handleMapBsSearch(req, res, apiKey) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const term = url.searchParams.get("term") ?? "";
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");

  if (req.method !== "GET" || term.length > MAX_TERM_LENGTH || !term.trim() || !apiKey) {
    res.statusCode = req.method === "GET" ? 200 : 405;
    res.end("[]");
    return;
  }

  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set("term", term.trim());
  upstream.searchParams.set("outputformat", "geom");
  upstream.searchParams.set("maxresults", "15");

  try {
    const upstreamRes = await fetch(upstream, { headers: { apikey: apiKey } });
    if (!upstreamRes.ok) {
      res.statusCode = 200;
      res.end("[]");
      return;
    }
    res.statusCode = 200;
    res.end(await upstreamRes.text());
  } catch {
    res.statusCode = 200;
    res.end("[]");
  }
}
