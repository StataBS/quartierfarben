/** Kanton Basel-Stadt Search API (api.geo.bs.ch/search/v1). */
import coordinates, { LV95, WGS84 } from "@swissgeo/coordinates";

const MAP_BS_SEARCH = "https://api.geo.bs.ch/search/v1/search";

/**
 * Read API key injected at build time (see `vite.config.js`: `API_KEY_MAPBS` from repo root `.env`).
 * @returns {string}
 */
export function getMapBsApiKey() {
  return typeof import.meta.env.PUBLIC_API_KEY_MAPBS === "string"
    ? import.meta.env.PUBLIC_API_KEY_MAPBS
    : "";
}

/**
 * @param {string} wkt
 * @returns {[number, number] | null} LV95 easting, northing
 */
export function lv95PointFromWkt(wkt) {
  if (!wkt || typeof wkt !== "string") return null;
  const t = wkt.trim();
  let m = t.match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  m = t.match(/\(\(\s*([-\d.]+)\s+([-\d.]+)\s*,/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  m = t.match(/^LINESTRING\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,/i);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  return null;
}

/**
 * @param {string} wkt
 * @returns {[number, number] | null} WGS84 longitude, latitude
 */
export function wgs84FromLv95Wkt(wkt) {
  const lv = lv95PointFromWkt(wkt);
  if (!lv) return null;
  return coordinates.coordinatesUtils.reprojectAndRound(LV95, WGS84, lv);
}

/**
 * @param {string} term
 * @param {string} apiKey
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{ display_name: string, lon: number, lat: number, layer_name?: string }>>}
 */
export async function searchMapBs(term, apiKey, opts = {}) {
  const limit = opts.limit ?? 15;
  const q = term?.trim();
  if (!apiKey || !q) return [];

  const url = new URL(MAP_BS_SEARCH);
  url.searchParams.set("term", q);
  url.searchParams.set("outputformat", "geom");
  url.searchParams.set("apikey", apiKey);

  let data;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];

  const out = [];
  for (const item of data) {
    if (out.length >= limit) break;
    const ll = wgs84FromLv95Wkt(item.geom);
    if (!ll) continue;
    const [lon, lat] = ll;
    out.push({
      display_name: (item.label && String(item.label).trim()) || "",
      lon,
      lat,
      layer_name: item.layer_name,
    });
  }
  return out;
}
