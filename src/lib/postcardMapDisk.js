import { browser } from "$app/environment";
import { get } from "svelte/store";
import destination from "@turf/destination";
import { getViewportCenterLngLat } from "$lib/geo/viewportAnalysisCenter.js";
import { analysisMap, circleRadius, postcardBackMapDiskReady } from "$lib/stores.js";

/** Raster size for the circular map snapshot (square). */
const EXPORT_PX = 256;

function nextFrames(n = 2) {
  return new Promise((resolve) => {
    let i = 0;
    function step() {
      if (i >= n) {
        resolve();
        return;
      }
      i++;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/**
 * Renders the current map view inside the analysis circle (same geometry as the overlay)
 * to a PNG data URL — the colored disk + white ring + center marker, like on screen.
 *
 * Requires the map to be created with `canvasContextAttributes: { preserveDrawingBuffer: true }`.
 *
 * @param {import('maplibre-gl').Map} map
 * @param {number} circleRadiusMeters
 * @returns {Promise<string | null>} data URL or null if not ready / tainted / clipped
 */
export async function captureMapCircleAsPngDataUrl(map, circleRadiusMeters) {
  if (!map?.getCanvas || typeof map.loaded !== "function" || !map.loaded()) {
    return null;
  }

  const center = getViewportCenterLngLat(map);

  await nextFrames(2);

  const cooUp = destination(center, circleRadiusMeters, 90, {
    units: "meters",
  }).geometry.coordinates;
  const rightPoints = map.project(cooUp);
  const centerPoints = map.project(center);
  const rCss = Math.abs(rightPoints.x - centerPoints.x);
  const cx = centerPoints.x;
  const cy = centerPoints.y;

  const container = map.getContainer();
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  if (!cw || !ch || !rCss) return null;

  const mapCanvas = map.getCanvas();
  const scaleX = mapCanvas.width / cw;
  const scaleY = mapCanvas.height / ch;

  const sx = (cx - rCss) * scaleX;
  const sy = (cy - rCss) * scaleY;
  const sw = 2 * rCss * scaleX;
  const sh = 2 * rCss * scaleY;

  if (sw < 2 || sh < 2) return null;

  const out = document.createElement("canvas");
  out.width = EXPORT_PX;
  out.height = EXPORT_PX;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  ctx.save();
  ctx.beginPath();
  ctx.arc(EXPORT_PX / 2, EXPORT_PX / 2, EXPORT_PX / 2, 0, 2 * Math.PI);
  ctx.clip();

  try {
    ctx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, EXPORT_PX, EXPORT_PX);
  } catch {
    ctx.restore();
    return null;
  }
  ctx.restore();

  const lineW = Math.max(1.5, EXPORT_PX * 0.008);
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.arc(
    EXPORT_PX / 2,
    EXPORT_PX / 2,
    EXPORT_PX / 2 - lineW / 2,
    0,
    2 * Math.PI,
  );
  ctx.stroke();

  const dotOuter = Math.max(3, EXPORT_PX * 0.028);
  const dotInner = Math.max(1.5, EXPORT_PX * 0.014);
  ctx.beginPath();
  ctx.arc(EXPORT_PX / 2, EXPORT_PX / 2, dotOuter, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(EXPORT_PX / 2, EXPORT_PX / 2, dotInner, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fill();

  try {
    return out.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Writes the live map disk into {@link PostcardBack.svelte}’s raster &lt;image&gt; (if present).
 * @returns {Promise<boolean>} true if a PNG data URL was applied
 */
export async function applyMapDiskToPostcardBackImage() {
  if (!browser) return false;
  const img = document.querySelector("#postcardBack #postcard-back-map-disk");
  if (!img) {
    postcardBackMapDiskReady.set(false);
    return false;
  }

  const map = get(analysisMap);
  const r = get(circleRadius);
  if (!map || r == null) {
    img.removeAttribute("href");
    return false;
  }

  const url = await captureMapCircleAsPngDataUrl(map, r);
  if (url) {
    img.setAttribute("href", url);
    const pie = document.querySelector("#postcard-back-landuse-pie");
    if (pie) pie.replaceChildren();
    postcardBackMapDiskReady.set(true);
    return true;
  }
  img.removeAttribute("href");
  postcardBackMapDiskReady.set(false);
  return false;
}
