import { browser } from "$app/environment";

import { searchAddresses } from "$lib/geo/geocodeSearch.js";

export default function getAddress(filterText) {
  if (!browser) return Promise.resolve([]);
  return searchAddresses(filterText, { limit: 15 });
}
