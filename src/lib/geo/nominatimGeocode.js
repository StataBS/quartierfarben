import { mapBounds, nominatimCountryCodes } from "$lib/settings.js";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

/**
 * Bounded Nominatim search using `mapBounds` from settings (viewbox left, top, right, bottom).
 * @param {string} term
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{ display_name: string, lon: number, lat: number }>>}
 */
export async function searchNominatim(term, opts = {}) {
  const limit = opts.limit ?? 15;
  const q = term?.trim();
  if (!q) return [];

  const minLon = mapBounds[0][0];
  const minLat = mapBounds[0][1];
  const maxLon = mapBounds[1][0];
  const maxLat = mapBounds[1][1];
  const left = minLon;
  const top = maxLat;
  const right = maxLon;
  const bottom = minLat;

  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("viewbox", `${left},${top},${right},${bottom}`);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", nominatimCountryCodes);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));

  let data;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];

  return data.map((result) => ({
    display_name: result.display_name,
    lon: Number(result.lon),
    lat: Number(result.lat),
  }));
}
