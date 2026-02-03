import intersect from "@turf/intersect";

export default function (map, circleGeom) {
  const grid = map.queryRenderedFeatures({ layers: ["gridLayer"] });
  let foundIntersection = false;
  grid.forEach(function (feature) {
    // Turf v7: intersect(featureCollection) with at least 2 polygon features
    const intersection = intersect({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: circleGeom, properties: {} },
        { type: "Feature", geometry: feature.geometry, properties: feature.properties || {} },
      ],
    });

    if (foundIntersection) return;
    if (intersection) {
      foundIntersection = true;
    } else {
    }
  });
  return foundIntersection;
}
