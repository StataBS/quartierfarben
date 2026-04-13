/**
 * City-specific config for analysis (circle-only here) and optional circle-mode labels.
 *
 * - areaModes: circle is the only analysis mode.
 * - circleLocationNeighbourhood: GeoJSON used for postcard neighbourhood name (point-in-polygon at map center).
 */
import wohnviertelData from "./wohnviertel.js";

/** Default analysis mode id */
export const CIRCLE_MODE_ID = "circle";

export const areaModes = [
  {
    id: "circle",
    labelKey: "useCircle",
    default: true,
  },
];

/**
 * When set, circle mode resolves a display name from these polygons (e.g. Wohnviertel).
 * Set `data` to null to disable neighbourhood labels.
 */
export const circleLocationNeighbourhood = {
  data: wohnviertelData,
  nameProperty: "wov_name",
};

/**
 * @param {string} modeId
 */
export function getAreaModeConfig(modeId) {
  return areaModes.find((m) => m.id === modeId);
}
