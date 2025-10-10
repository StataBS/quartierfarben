// Some global settings you may want to adjust when adapting the project to your city

export const projectTitle = "Quartierfarben";

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

export const postcardMargin = 8; // in layout units, TODO convert to mm!

// Map settings

export const mapBounds = [ //should be bigger than city boundingbox, because city boundingbox borders should be possible to be dragged to center of screen, where the landuse analysis takes place
    [7.5, 47.5], // Southwest coordinates
    [7.7, 47.6], // Northeast coordinates
  ];

export const initialMapCenter = [7.58979, 47.56022]; // Basel

export const mapMinZoom = 12;

export const mapMaxZoom = 17;

export const analysisRadiusInMeters = 250;

// Chosen for treemaps: high contrast, minimal confusion within each season.
const PALETTES = {
    spring: [
        "#e4e4e4", // street
        "#81C784", // greenspace
        "#f9ad9a", // living
        "#C0A98E", // building
        "#949494", // rail
        "#64B5F6", // water
        "#DB1A00", // leisure
        "#146C8B", // public_space
        "#2A713F", // sports
        "#C196DC", // education
        "#5B3821", // industry
        "#2c2c2c"  // other
    ],
    summer: [
        "#e4e4e4", // street
        "#388E3C", // greenspace
        "#f9ad9a", // living
        "#C0A98E", // building
        "#949494", // rail
        "#2196F3", // water
        "#DB1A00", // leisure
        "#146C8B", // public_space
        "#2A713F", // sports
        "#C196DC", // education
        "#5B3821", // industry
        "#2c2c2c"  // other
    ],
    autumn: [
        "#e4e4e4", // street
        "#f9af72", // greenspace
        "#E07A5F", // living
        "#C0A98E", // building
        "#949494", // rail
        "#42A5F5", // water
        "#DB1A00", // leisure
        "#146C8B", // public_space
        "#2A713F", // sports
        "#C196DC", // education
        "#5B3821", // industry
        "#2c2c2c"  // other
    ],
    winter: [
        "#e4e4e4", // street
        "#A5D6A7", // greenspace
        "#f9ad9a", // living
        "#C0A98E", // building
        "#949494", // rail
        "#90CAF9", // water
        "#DB1A00", // leisure
        "#146C8B", // public_space
        "#2A713F", // sports
        "#C196DC", // education
        "#5B3821", // industry
        "#2c2c2c"  // other
    ],
};


// ---- Base (names stay constant) ----
export const BASE_CATEGORIES = {
    street:       { color: "#", name_en: "Streets & Ways",      name: "Strassen & Wege" },
    greenspace:   { color: "#", name_en: "Nature",               name: "Grünflächen" },
    living:       { color: "#", name_en: "Living",               name: "Wohnen" },
    building:     { color: "#", name_en: "Other buildings",      name: "sonstige Gebäude" },
    rail:         { color: "#", name_en: "Rail",                 name: "Bahn" },
    water:        { color: "#", name_en: "Water",                name: "Wasser" },
    leisure:      { color: "#", name_en: "Culture & Leisure",    name: "Kultur & Unterhaltung" },
    public_space: { color: "#", name_en: "Other Public Space",   name: "sonstiger öffentlicher Raum" },
    sports:       { color: "#", name_en: "Sports",               name: "Sport" },
    education:    { color: "#", name_en: "Education",            name: "Schule & Bildung" },
    industry:     { color: "#", name_en: "Industrial Area",      name: "Industrieareal" },
    other:        { color: "#", name_en: "Other",                name: "Sonstiges" }
};

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
export const categories = buildCategoriesForSeason(new Date());

// Landuse tiles settings
export const landuseFieldname = "nutzung";

// Basel landuses → categories (names match your inputs verbatim)
export let landuses = {
    "humusiert - uebrige humusierte - Gewaesservorland humusiert":  { category: "greenspace"},
    "befestigt - uebrige befestigte - Gewaesservorland befestigt":  { category: "street"},
    "befestigt - uebrige befestigte - Sportanlage befestigt":  { category: "sports"},
    "befestigt - Bahn - Tramareal":  { category: "rail"},
    "befestigt - Trottoir":  { category: "street"},
    "bestockt - uebrige bestockte":  { category: "greenspace"},
    "humusiert - Gartenanlage - Gartenanlage":  { category: "greenspace"},
    "humusiert - Intensivkultur - Reben":  { category: "greenspace"},
    "humusiert - Intensivkultur - uebrige Intensivkultur":  { category: "greenspace"},
    "humusiert - uebrige humusierte - uebrige humusierte": { category: "greenspace"},
    "Gebaeude - Gebaeude": { category: "building"},
    "Gebäude - Provisorische Unterkunft": { category: "living"},
    "Gebäude - Gebäude ausschliesslich für Wohnnutzung": { category: "living"},
    "Gebäude - Einfamilienhaus, ohne Nebennutzung" : { category: "living"},
    "Gebäude - Mehrfamilienhaus, ohne Nebennutzung" : { category: "living"},
    "Gebäude - Wohngebäude mit Nebennutzung": { category: "living"},
    "Gebäude - Gebäude mit teilweiser Wohnnutzung": { category: "living"},
    "Gebäude - Gebäude ohne Wohnnutzung": { category: "building"},
    "Gebäude - Sonderbau": { category: "building"},
    "befestigt - uebrige befestigte - öffentlicher Raum": { category: "public_space"},
    "befestigt - uebrige befestigte - kein öffentlicher Raum": { category: "other"},
    "befestigt - Strasse Weg": { category: "street"},
    "humusiert - Acker Wiese Weide": { category: "greenspace"},
    "befestigt - Verkehrsinsel": { category: "street"},
    "Gewaesser - stehendes": { category: "water"},
    "humusiert - Gartenanlage - Friedhof": { category: "greenspace"},
    "humusiert - Gartenanlage - Tierpark": { category: "greenspace"},
    "humusiert - Gartenanlage - Parkanlage Spielplatz": { category: "greenspace"},
    "humusiert - Gartenanlage - Schrebergarten": { category: "greenspace"},
    "humusiert - Gartenanlage - Sportanlage humusiert": { category: "sports"},
    "befestigt - Bahn - Bahnareal": { category: "rail"},
    "befestigt - uebrige befestigte - Hafenareal": { category: "industry"},
    "bestockt - geschlossener Wald": { category: "greenspace"},
    "befestigt - Wasserbecken": { category: "water"},
    "befestigt - uebrige befestigte - Fabrikareal": { category: "industry"},
    "Gebaeude - Tank": { category: "industry"},
    "Gewaesser - fliessendes": { category: "water"},
    "Gebäude - Museen, Ausstellungen, Sammlungen" : { category: "leisure"},
    "Gebäude - Konzerte, Theater, Vorträge" : { category: "leisure"},
    "Gebäude - Sekundarschule": { category: "education"},
    "Gebäude - Primarschule": { category: "education"},
    "Gebäude - Kindergarten": { category: "education"},
    "Gebäude - Allgemeine Gewerbeschule" : { category: "education"},
    "Gebäude - Tagesstruktur": { category: "education"},
    "Gebäude - Spezialangebot": { category: "education"},
    "Gebäude - Schule für Gestaltung" : { category: "education"},
    "Gebäude - Zentrum für Brückenangebote": { category: "education"},
    "Gebäude - Fachmaturitätsschule" : { category: "education"},
    "Gebäude - Mensa": { category: "education"},
    "Gebäude - Berufsfachschule": { category: "education"},
    "Gebäude - Turnhalle": { category: "sports"},
    "Gebäude - Gymnasium" : { category: "education"},
    "Gebäude - Berufsfachschule/Schule für Gestaltung" : { category: "education"},
    "Gebäude - Schwimmhalle": { category: "sports"},
    "Gebäude - WMS / IMS": { category: "education"}
};
