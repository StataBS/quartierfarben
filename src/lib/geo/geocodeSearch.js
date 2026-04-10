import { geocodeProvider } from "$lib/settings.js";
import { getMapBsApiKey, searchMapBs } from "$lib/geo/mapBsGeocode.js";
import { searchNominatim } from "$lib/geo/nominatimGeocode.js";

/**
 * Unified address search for the UI. Dispatches by `geocodeProvider` in `settings.js`.
 *
 * @param {string} term
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{ display_name: string, lon: number, lat: number, layer_name?: string }>>}
 */
export async function searchAddresses(term, opts) {
  if (geocodeProvider === "nominatim") {
    return searchNominatim(term, opts);
  }
  return searchMapBs(term, getMapBsApiKey(), opts);
}
