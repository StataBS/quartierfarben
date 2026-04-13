/**
 * Basel-Stadt WMTS (EPSG:3857) via mapcache REST templates.
 * MapLibre uses OSM tile grid {z}/{x}/{y}; this service expects TileMatrix=z, TileRow=y, TileCol=x.
 * @see https://wmts.geo.bs.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml
 */
const BS_WMTS = "https://wmtscache.fgi.cloud.bs.ch/mapcache/wmts/1.0.0";

/** @type {const} */
export const BASEMAP_IDS = ["none", "grund_grau", "osm"];

/** MapLibre layer ids (raster layers above landuse). */
export const BASEMAP_LAYER_IDS = {
  osm: "basemap-osm",
  grund_grau: "basemap-grund-grau",
};

/** WMTS: Stadtplan grau (Grundkarte). */
export const basemapWmtsTiles = {
  grund_grau: `${BS_WMTS}/SP_Stadtplan_2021_grau/default/v1/3857/{z}/{y}/{x}.png`,
};

/** HTML snippets for the active basemap (shown next to the control). */
export const basemapAttribution = {
  none: "",
  osm: "© <a target='_blank' rel='noopener' href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
  grund_grau:
    "© <a target='_blank' rel='noopener' href='https://www.geo.bs.ch/'>Geodaten Kanton Basel-Stadt</a> (Stadtplan grau)",
};
