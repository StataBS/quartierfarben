/**
 * City-specific config for area modes (circle, wahlkreis, wohnviertel, etc.).
 * Adapt this file and the referenced data files when deploying to another city.
 *
 * - areaModes: list of analysis modes. "circle" is always first and required.
 *   Polygon modes have: id, labelKey, selectLabelKey, data (GeoJSON), idProperty, nameProperty.
 * - locationLabelPolygonModeId: optional; when in circle mode, use this mode's data
 *   to resolve location name (e.g. "wohnviertel" → show neighbourhood name under coordinates).
 */

import wahlkreiseData from "./wahlkreise.js";
import wohnviertelData from "./wohnviertel.js";

/** Default mode when no polygon mode is selected */
export const CIRCLE_MODE_ID = "circle";

/**
 * Area modes configuration.
 * For a city with only circle analysis, use: [{ id: "circle", labelKey: "circle", default: true }]
 * Add one object per polygon mode (Wahlkreis, Wohnviertel, Bezirk, etc.) with data and property names.
 */
export const areaModes = [
  {
    id: "circle",
    labelKey: "useCircle",
    default: true,
  },
  {
    id: "wahlkreis",
    labelKey: "wahlkreis",
    selectLabelKey: "selectWahlkreis",
    data: wahlkreiseData,
    idProperty: "objid",
    nameProperty: "wahlkreis",
  },
  {
    id: "wohnviertel",
    labelKey: "wohnviertel",
    selectLabelKey: "selectWohnviertel",
    data: wohnviertelData,
    idProperty: "wov_id",
    nameProperty: "wov_name",
  },
];

/**
 * When in circle mode, use this mode's polygon layer to resolve location name (point-in-polygon).
 * Set to null if you don't have such a layer or don't want neighbourhood names.
 */
export const locationLabelPolygonModeId = "wohnviertel";

/**
 * Get config for a mode by id.
 * @param {string} modeId - e.g. "circle", "wahlkreis", "wohnviertel"
 * @returns {object|undefined}
 */
export function getAreaModeConfig(modeId) {
  return areaModes.find((m) => m.id === modeId);
}

/** Polygon modes only (excludes circle), for dropdowns and URL params */
export function getPolygonAreaModes() {
  return areaModes.filter((m) => m.id !== CIRCLE_MODE_ID);
}
