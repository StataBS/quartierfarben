import { getViewportCenterLngLat } from "./viewportAnalysisCenter.js";

/**
 * Same shape as MapLibre’s default hash: #zoom/lat/lng
 * Lat/lng are the analysis point at the map container center (full-viewport map + UI overlays).
 */
export function parseAnalysisHash(hashStr) {
  const raw = (hashStr || "").replace(/^#/, "").trim();
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length < 3) return null;
  const zoom = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  const lng = parseFloat(parts[2]);
  if (![zoom, lat, lng].every((n) => Number.isFinite(n))) return null;
  return { zoom, lat, lng };
}

/** Precision matches maplibre-gl/src/ui/hash.ts getHashString (non-feedback). */
export function formatAnalysisHash(map) {
  const zoom = Math.round(map.getZoom() * 100) / 100;
  const [lng, lat] = getViewportCenterLngLat(map);
  const precision = Math.ceil(
    (zoom * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10
  );
  const m = Math.pow(10, precision);
  const rLng = Math.round(lng * m) / m;
  const rLat = Math.round(lat * m) / m;
  return `#${zoom}/${rLat}/${rLng}`;
}
