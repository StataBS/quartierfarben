/** Address search via the same-origin proxy. The MapBS key stays on the server. */
import { resolve } from "$app/paths";
import coordinates, { LV95, WGS84 } from "@swissgeo/coordinates";

const SEARCH_PATH = "/api/mapbs-search";

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
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{ display_name: string, lon: number, lat: number, layer_name?: string }>>}
 */
export async function searchMapBs(term, opts = {}) {
  const limit = opts.limit ?? 15;
  const q = term?.trim();
  if (!q || typeof window === "undefined") return [];

  const url = new URL(resolve(SEARCH_PATH.slice(1)), window.location.origin);
  url.searchParams.set("term", q);

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
