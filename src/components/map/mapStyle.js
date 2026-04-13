import { landuses, categories, landuseFieldname } from "$lib/settings.js";
import { basemapWmtsTiles } from "$lib/basemapTiles.js";

const landuseColors = [];
Object.keys(landuses).forEach((key) => {
  landuseColors.push(key);
  landuseColors.push(categories[landuses[key].category].color);
});

const osmAttribution =
  "&copy; <a target='_blank' href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a target='_blank' href='https://carto.com/attributions'>CARTO</a>";

const wmtsAttribution =
  "&copy; <a target='_blank' href='https://www.geo.bs.ch/'>Geodaten Kanton Basel-Stadt</a>";

export default function (location) {
  return {
    version: 8,
    name: "orthoPhotos",
    metadata: {},
    transition: {
      duration: 3500,
      delay: 0,
    },
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: osmAttribution,
      },
      "basemap-grund-grau": {
        type: "raster",
        tiles: [basemapWmtsTiles.grund_grau],
        tileSize: 256,
        attribution: wmtsAttribution,
      },
      "landuse-source": {
        type: "vector",
        tiles: [location + "tiles/{z}/{x}/{y}.pbf"],
        minzoom: 10,
        maxzoom: 13,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#ccc",
        },
      },
      {
        id: "landuse",
        type: "fill",
        source: "landuse-source",
        "source-layer": "landuse-data",
        maxzoom: 24,
        paint: {
          "fill-opacity": 1,
          "fill-color": [
            "match",
            ["to-string", ["get", landuseFieldname]],
            ...landuseColors,
            "#fff",
          ],
        },
      },
      {
        id: "landuse-line",
        type: "line",
        source: "landuse-source",
        "source-layer": "fleachen",
        maxzoom: 24,
        paint: {
          "line-opacity": 0.5,
          "line-color": "#000000",
        },
      },
      {
        id: "basemap-grund-grau",
        type: "raster",
        source: "basemap-grund-grau",
        layout: {
          visibility: "none",
        },
        paint: {
          "raster-opacity": 0.5,
        },
        minzoom: 0,
      },
      {
        id: "basemap-osm",
        type: "raster",
        source: "osm",
        layout: {
          visibility: "none",
        },
        paint: {
          "raster-saturation": -1,
          "raster-contrast": 0.1,
          "raster-opacity": 0.7,
        },
        minzoom: 0,
      },
    ],
  };
}
