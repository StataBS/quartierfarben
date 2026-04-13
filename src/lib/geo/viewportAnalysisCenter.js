/**
 * Analysis uses the map container center — same as MapLibre `getCenter()` / `setCenter()`.
 * With a full-viewport map layer and UI as overlays, this matches the screen center on desktop
 * and mobile without measuring sidebars or the postcard.
 */
export function getAnalysisFocalPixelInContainer(map) {
  const rect = map.getContainer().getBoundingClientRect();
  return [rect.width / 2, rect.height / 2];
}

/** Geographic point at the analysis focal pixel (map container center). */
export function getViewportCenterLngLat(map) {
  const [x, y] = getAnalysisFocalPixelInContainer(map);
  const ll = map.unproject([x, y]);
  return [ll.lng, ll.lat];
}

/** Zoom +/-1 around the analysis focal so lat/lng on the card stay fixed. */
export function zoomInAroundAnalysisFocal(map) {
  const [lng, lat] = getViewportCenterLngLat(map);
  map.zoomIn({ around: [lng, lat], duration: 200 });
}

export function zoomOutAroundAnalysisFocal(map) {
  const [lng, lat] = getViewportCenterLngLat(map);
  map.zoomOut({ around: [lng, lat], duration: 200 });
}
