import intersect from "@turf/intersect";
import area from "@turf/area";
import { landuseFieldname } from "$lib/settings";

export default function (map, polygonGeom, landuses) {
  let sizes = {};
  let sumSizes = 0;
  const landuse = map.queryRenderedFeatures({ layers: ["landuse"] });
  landuse.forEach(function (feature) {
    // Turf v7: intersect(featureCollection) with at least 2 polygon features
    const intersection = intersect({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: polygonGeom, properties: {} },
        { type: "Feature", geometry: feature.geometry, properties: feature.properties || {} },
      ],
    });
    if (intersection) {
      const size = area(intersection);
      const category = landuses[feature.properties[landuseFieldname]].category;
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
