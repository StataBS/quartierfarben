/**
 * Export map legend (MapKey) as SVG, PDF, JPEG, and TIFF.
 * Run from app/: node scripts/export-map-legend.mjs [--lang de|en] [--out DIR]
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");

const CATEGORY_ORDER = [
  "traffic",
  "greenspace",
  "forest",
  "living",
  "building",
  "water",
  "leisure",
  "industry",
  "other",
];

const SWATCH = 16;
const SWATCH_BORDER = 1.5;
const GAP_SWATCH_TEXT = 4;
const ITEM_GAP_RIGHT = 12;
const ROW_GAP = 8;
const PAD = 16;
const FONT_SIZE = 16;
const SWATCH_LEADING = 8;
const MAX_ROW_WIDTH = 608;
const EXPORT_DPI = 300;
const SCALE = EXPORT_DPI / 96;

function parseArgs(argv) {
  let lang = "de";
  let outDir = join(appRoot, "..", "exports", "legend");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--lang" && argv[i + 1]) lang = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) outDir = argv[++i];
  }
  return { lang, outDir };
}

function buildCategories(colorConfig) {
  const palette = colorConfig.palettes.always;
  return CATEGORY_ORDER.map((key) => ({
    color: palette[key],
    name: colorConfig.categories[key].name,
    name_en: colorConfig.categories[key].name_en,
  }));
}

/** Fira Mono 16px: ~0.61× em per character */
function textWidthPx(label) {
  return Math.ceil(label.length * FONT_SIZE * 0.61);
}

function layoutItems(entries, lang) {
  const items = entries.map((e) => {
    const label = lang === "en" ? e.name_en : e.name;
    const w =
      SWATCH_LEADING + SWATCH + GAP_SWATCH_TEXT + textWidthPx(label) + ITEM_GAP_RIGHT;
    return { ...e, label, width: w };
  });

  const rows = [];
  let row = [];
  let rowW = 0;
  for (const item of items) {
    const nextW = row.length ? rowW + item.width : item.width;
    if (row.length && nextW > MAX_ROW_WIDTH) {
      rows.push(row);
      row = [item];
      rowW = item.width;
    } else {
      row.push(item);
      rowW = nextW;
    }
  }
  if (row.length) rows.push(row);
  return rows;
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg(rows, fontFaceCss) {
  const rowHeights = rows.map(() => SWATCH + ROW_GAP);
  const width = Math.min(
    MAX_ROW_WIDTH,
    Math.max(...rows.map((r) => r.reduce((s, it) => s + it.width, 0))),
  );
  const height =
    PAD * 2 + rowHeights.reduce((s, h) => s + h, 0) - ROW_GAP;

  let y = PAD;
  const parts = [];
  for (const row of rows) {
    let x = PAD;
    const cy = y + SWATCH / 2;
    for (const item of row) {
      const r = SWATCH / 2;
      parts.push(
        `<circle cx="${x + SWATCH_LEADING + r}" cy="${cy}" r="${r}" fill="${item.color}" stroke="#ffffff" stroke-width="${SWATCH_BORDER}"/>`,
      );
      const tx = x + SWATCH_LEADING + SWATCH + GAP_SWATCH_TEXT;
      parts.push(
        `<text x="${tx}" y="${cy}" dominant-baseline="middle" font-family="Fira Mono, ui-monospace, monospace" font-size="${FONT_SIZE}" fill="#333333">${escapeXml(item.label)}</text>`,
      );
      x += item.width;
    }
    y += SWATCH + ROW_GAP;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>${fontFaceCss}</style></defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${parts.join("\n  ")}
</svg>`;
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  const { lang, outDir } = parseArgs(process.argv);
  const colorConfig = JSON.parse(
    readFileSync(join(appRoot, "src/lib/colors.json"), "utf8"),
  );
  const fontFaceCss = readFileSync(
    join(appRoot, "src/assets/postcard-back-font-fira-mono.txt"),
    "utf8",
  );

  const entries = buildCategories(colorConfig);
  const rows = layoutItems(entries, lang);
  const svg = buildSvg(rows, fontFaceCss);

  mkdirSync(outDir, { recursive: true });
  const base = join(outDir, `quartierfarben-legend-${lang}`);
  const svgPath = `${base}.svg`;
  const pngPath = `${base}.png`;
  const pdfPath = `${base}.pdf`;
  const jpgPath = `${base}.jpg`;
  const tiffPath = `${base}.tiff`;

  writeFileSync(svgPath, svg, "utf8");

  const w = Math.ceil(
    Math.min(
      MAX_ROW_WIDTH,
      Math.max(...rows.map((r) => r.reduce((s, it) => s + it.width, 0))),
    ) * SCALE,
  );
  const rowCount = rows.length;
  const h = Math.ceil(
    (PAD * 2 + rowCount * (SWATCH + ROW_GAP) - ROW_GAP) * SCALE,
  );

  run(
    `rsvg-convert -f png -d ${EXPORT_DPI} -p ${EXPORT_DPI} -w ${w} -o "${pngPath}" "${svgPath}"`,
  );
  run(`rsvg-convert -f pdf -d ${EXPORT_DPI} -p ${EXPORT_DPI} -o "${pdfPath}" "${svgPath}"`);
  run(`sips -s format jpeg -s formatOptions 95 "${pngPath}" --out "${jpgPath}"`);
  run(`sips -s format tiff "${pngPath}" --out "${tiffPath}"`);

  console.log(`Wrote ${svgPath}`);
  console.log(`Wrote ${pdfPath}`);
  console.log(`Wrote ${jpgPath}`);
  console.log(`Wrote ${tiffPath}`);
}

main();
