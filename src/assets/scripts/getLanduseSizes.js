import intersect from "@turf/intersect";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { landuseFieldname } from "$lib/settings";

/**
 * @param {[number, number, number, number]} a [minLng, minLat, maxLng, maxLat]
 * @param {[number, number, number, number]} b
 */
function bboxesOverlap(a, b) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

/**
 * Pixel bounding box on the map for `queryRenderedFeatures`, padded slightly.
 * @param {import('maplibre-gl').Map} map
 * @param {import('geojson').Polygon | import('geojson').MultiPolygon} polygonGeom
 * @returns {[[number, number], [number, number]]}
 */
function screenBBoxForAnalysisPolygon(map, polygonGeom) {
  const box = bbox({ type: "Feature", geometry: polygonGeom, properties: {} });
  const corners = [
    [box[0], box[1]],
    [box[2], box[1]],
    [box[2], box[3]],
    [box[0], box[3]],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [lng, lat] of corners) {
    const p = map.project([lng, lat]);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 4;
  return [
    [minX - pad, minY - pad],
    [maxX + pad, maxY + pad],
  ];
}

export default function (map, polygonGeom, landuses) {
  const sizes = {};
  let sumSizes = 0;

  const analysisBbox = bbox({
    type: "Feature",
    geometry: polygonGeom,
    properties: {},
  });

  const screenBbox = screenBBoxForAnalysisPolygon(map, polygonGeom);
  const landuse = map.queryRenderedFeatures(screenBbox, { layers: ["landuse"] });

  landuse.forEach(function (feature) {
    const nutzung = feature.properties?.[landuseFieldname];
    if (nutzung == null || !landuses[nutzung]) return;

    const fb = bbox(feature);
    if (!bboxesOverlap(analysisBbox, fb)) return;

    const intersection = intersect({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: polygonGeom, properties: {} },
        feature,
      ],
    });
    if (intersection) {
      const size = area(intersection);
      const category = landuses[nutzung].category;
      if (!sizes[category]) {
        sizes[category] = {};
        sizes[category].m = size;
      } else {
        sizes[category].m += size;
      }
      sumSizes += size;
    }
  });
  Object.keys(sizes).forEach(function (key) {
    sizes[key].p = (sizes[key].m / sumSizes) * 100;
  });

  return { sizes, sumSizes };
}
