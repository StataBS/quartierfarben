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
export const landuseFieldname = "nutzung";

export let categories = {
    street: { color: "#3A3838", name_en: "Streets & Ways", name: "Strassen & Wege" },
    living: { color: "#F0BD9F", name_en: "Living", name: "Wohnen" },
    building: { color: "#C4C4C4", name_en: "other buildings", name: "sonstige Gebäude" },
    rail: { color: "#898989", name_en: "Rail", name: "Bahn" },
    water: { color: "#D0E4DE", name_en: "Water", name: "Wasser" },
    greenspace: { color: "#92BA95", name_en: "Nature", name: "Grünflächen" },
    industry: { color: "#B68B3A", name_en: "Industrial Area", name: "Industrieareal" },
    leisure: { color: "#8B515C", name_en: "Culture & Leisure", name: "Kultur & Unterhaltung" },
    sports: { color: "#E8D569", name_en: "Sports", name: "Sport" },
    education: { color: "#758EBA", name_en: "Education", name: "Schule & Bildung" },
    public_space: { color: "#665B44", name_en: "other Public Space", name: "sonstiger öffentlicher Raum" },
    other: { color: "#D3D3D3", name_en: "Other", name: "Sonstiges" }
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
