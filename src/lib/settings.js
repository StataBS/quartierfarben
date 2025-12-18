// Some global settings you may want to adjust when adapting the project to your city

// Load color configuration from JSON file (single source of truth)
import colorConfig from './colors.json';

export const projectTitle = "Quartierfarben Basel-Stadt";

export const og_siteName = "Statistisches Amt @ Kanton Basel-Stadt";

export const country = "CH"; //for Nominatim request

export const url = "https://opendatabs.github.io/quartierfarben/"; //for sharing

// App settings and defaults

export const useLocationAsText = true; // Show lat/lng as text on the card

export const defaultTextOnCard = ""; // leave empty to show placeholder text

export const defaultLanguage = "de";

export const printBackUI = false;

export const downloadFilename = "Quartierfarben-postcard";

export const backsideSuffix = "-backside";

// Design settings (interim solution as long as Tailwind is used in this project)

export const colors= {
  primary: "#313178",
  secondary: "#9F4305"
}; // set button colors

// Postcard (diagram) settings

export const postcardFooter = "Geo-Tag 2024 — opendatabs.github.io/quartierfarben"; // leave empty to hide footer

export const labelContrast = 1.3;

export const postcardWidth = 105; // in mm

export const postcardHeight = 148; // in mm

export const postcardMargin = 0; // in layout units,

// Map settings

//should be bigger than city boundingbox, because city boundingbox borders should be possible to be dragged to center of screen, where the landuse analysis takes place
export const mapBounds = [
    [7.4, 47.47], // Southwest coordinates
    [7.85, 47.66], // Northeast coordinates
  ];

export const initialMapCenter = [7.58979, 47.56022]; // Basel

export const mapMinZoom = 12;

export const mapMaxZoom = 17;

export const analysisRadiusInMeters = 250;

// Transform JSON structure to match expected format
// Category order (must match the order in JSON palettes)
const CATEGORY_ORDER = ["traffic", "greenspace", "forest", "living", "building", "water", "leisure", "industry", "other"];

// Convert palette objects to arrays in the correct order
const PALETTES = {};
for (const [season, palette] of Object.entries(colorConfig.palettes)) {
    PALETTES[season] = CATEGORY_ORDER.map(cat => palette[cat]);
}

// Base categories from JSON
export const BASE_CATEGORIES = {};
for (const [key, value] of Object.entries(colorConfig.categories)) {
    BASE_CATEGORIES[key] = {
        color: "#", // Will be filled by buildCategoriesForSeason
        name_en: value.name_en,
        name: value.name
    };
}

// ---- Determine meteorological season (Northern Hemisphere) ----
// Spring: Mar 1–May 31; Summer: Jun 1–Aug 31; Autumn: Sep 1–Nov 30; Winter: Dec 1–Feb 28/29.
export function getSeason(date = new Date()) {
    const m = date.getMonth();
    if (m >= 2 && m <= 4)  return "spring";
    if (m >= 5 && m <= 7)  return "summer";
    if (m >= 8 && m <= 10) return "autumn";
    return "winter"; // Dec, Jan, Feb
}

// ---- Build categories with colors for a given season or date ----
// Accepts a season string ("spring"|"summer"|"autumn"|"winter") OR a Date.
export function buildCategoriesForSeason(seasonOrDate) {
    const season = typeof seasonOrDate === "string" ? seasonOrDate : getSeason(seasonOrDate);
    const palette = PALETTES[season];
    if (!palette) throw new Error(`Unknown season: ${season}`);

    const keys = Object.keys(BASE_CATEGORIES); // stable order
    if (palette.length < keys.length) {
        throw new Error(`Palette for ${season} has only ${palette.length} colors, need ${keys.length}.`);
    }

    // Assign colors by category order to ensure deterministic mapping.
    const out = {};
    keys.forEach((key, idx) => {
        out[key] = { ...BASE_CATEGORIES[key], color: palette[idx] };
    });
    return out;
}

// ---- Export seasonal categories for "now" ----
// export const categories = buildCategoriesForSeason(new Date());
// ---- Export seasonal categories for "always" ----
export const categories = buildCategoriesForSeason("always");
// ---- Exprt for every season ----
// export const categories = buildCategoriesForSeason("spring");
// export const categories = buildCategoriesForSeason("summer");
// export const categories = buildCategoriesForSeason("autumn");
// export const categories = buildCategoriesForSeason("winter");

// Landuse tiles settings
export const landuseFieldname = "nutzung";

// Basel landuses → categories (loaded from JSON - single source of truth)
export let landuses = {};
for (const [landuse, category] of Object.entries(colorConfig.landuseMapping)) {
    landuses[landuse] = { category: category };
}
