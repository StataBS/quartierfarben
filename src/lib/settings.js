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

// Landuse tiles settings
export const landuseFieldname = "bs_art_txt";

export let categories = {
    street: { color: "#3A3838", name_en: "Street", name: "Strassen" },
    living: { color: "#F0BD9F", name_en: "Building", name: "Gebäude" },
    rail: { color: "#898989", name_en: "Rail", name: "Bahn" },
    water: { color: "#D0E4DE", name_en: "Water", name: "Wasser" },
    greenspace: { color: "#92BA95", name_en: "Nature", name: "Grünflächen" },
    industry: { color: "#B68B3A", name_en: "Economy", name: "Wirtschaft" },
    leisure: { color: "#8B515C", name_en: "Culture and Leisure", name: "Kultur und Freizeit" },
    sports: { color: "#E8D569", name_en: "Sports", name: "Sport" },
    education: { color: "#758EBA", name_en: "Education", name: "Schule und Bildung" },
    infrastructure: { color: "#665B44", name_en: "Infrastructure", name: "Infrastruktur" },
};

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
    "Gebaeude - Gebaeude": { category: "living"},
    "befestigt - uebrige befestigte - uebrige befestigte": { category: "infrastructure"},
    "befestigt - Strasse Weg": { category: "street"},
    "humusiert - Acker Wiese Weide": { category: "greenspace"},
    "befestigt - Verkehrsinsel": { category: "street"},
    "Gewaesser - stehendes": { category: "water"},
    "humusiert - Gartenanlage - Friedhof": { category: "greenspace"},
    "humusiert - Gartenanlage - Tierpark": { category: "leisure"},
    "humusiert - Gartenanlage - Parkanlage Spielplatz": { category: "greenspace"},
    "humusiert - Gartenanlage - Schrebergarten": { category: "greenspace"},
    "humusiert - Gartenanlage - Sportanlage humusiert": { category: "sports"},
    "befestigt - Bahn - Bahnareal": { category: "rail"},
    "befestigt - uebrige befestigte - Hafenareal": { category: "industry"},
    "bestockt - geschlossener Wald": { category: "greenspace"},
    "befestigt - Wasserbecken": { category: "water"},
    "befestigt - uebrige befestigte - Fabrikareal": { category: "industry"},
    "Gebaeude - Tank": { category: "infrastructure"},
    "Gewaesser - fliessendes": { category: "water"},
};
