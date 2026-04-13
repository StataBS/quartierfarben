import { getMapBsApiKey, searchMapBs } from "$lib/geo/mapBsGeocode.js";

/**
 * Address search (Kanton Basel-Stadt Search API).
 *
 * @param {string} term
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{ display_name: string, lon: number, lat: number, layer_name?: string }>>}
 */
export async function searchAddresses(term, opts) {
  return searchMapBs(term, getMapBsApiKey(), opts);
}
