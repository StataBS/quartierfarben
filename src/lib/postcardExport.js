import { browser } from "$app/environment";
import { get } from "svelte/store";
import { encode } from "$assets/scripts/base64";
import firaMonoCss from "$assets/postcard-back-font-fira-mono.txt?raw";
import { areaSizes } from "./stores.js";
import { categories } from "./settings.js";
import { renderLandusePieIntoGroup } from "./postcardBackPie.js";
import { applyMapDiskToPostcardBackImage } from "./postcardMapDisk.js";

export function fillPostcardBackPieFromStores() {
  if (!browser) return;
  const g = document.querySelector("#postcardBack #postcard-back-landuse-pie");
  if (!g) return;
  renderLandusePieIntoGroup(g, get(areaSizes), categories);
}

/**
 * Inlines raster (and vector) &lt;image href&gt; targets as data URLs for offline SVG.
 */
export async function inlineExternalImagesInSvg(svgEl) {
  if (!browser || !svgEl) return;
  const images = svgEl.querySelectorAll("image");
  for (const img of images) {
    const href =
      img.getAttribute("href") || img.getAttribute("xlink:href") || "";
    if (!href || href.startsWith("data:")) continue;
    const url = href.startsWith("http")
      ? href
      : new URL(href, window.location.origin).href;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      img.setAttribute("href", dataUrl);
      img.removeAttribute("xlink:href");
    } catch (e) {
      console.warn("postcard export: could not inline image", href, e);
    }
  }
}

export async function preparePostcardBackForExport() {
  if (!browser) return;
  const ok = await applyMapDiskToPostcardBackImage();
  if (!ok) fillPostcardBackPieFromStores();
  const svg = document.getElementById("postcardBack");
  if (svg) await inlineExternalImagesInSvg(svg);
}

/**
 * @param {import("d3-selection").Selection<SVGSVGElement, unknown, null, undefined>} svgSelection
 */
export function encodeFrontSvgForExport(svgSelection) {
  if (!svgSelection?.node) return "";
  const titleText = svgSelection.selectAll(".title-text");
  const prevOpacity = titleText.attr("opacity");
  const prevStyleOpacity = titleText.style("opacity");
  titleText.attr("opacity", 1).style("opacity", null);
  try {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.setAttribute("class", "font-export-temp");
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.type = "text/css";
    style.innerHTML = firaMonoCss;
    defs.appendChild(style);
    svgSelection.node().appendChild(defs);
    return encode(svgSelection.node().outerHTML);
  } finally {
    if (prevOpacity == null || prevOpacity === "") {
      titleText.attr("opacity", null);
    } else {
      titleText.attr("opacity", prevOpacity);
    }
    if (prevStyleOpacity == null || prevStyleOpacity === "") {
      titleText.style("opacity", null);
    } else {
      titleText.style("opacity", prevStyleOpacity);
    }
    svgSelection.select("defs.font-export-temp").remove();
  }
}

const PRINT_ROOT_ID = "quartierfarben-print-root";
const PRINTING_CLASS = "quartierfarben-printing";

/**
 * @param {string} b64
 * @returns {string}
 */
function decodeSvgMarkupFromB64(b64) {
  const dataUrl = "data:image/svg+xml;base64,\n" + b64;
  const base64 = dataUrl.split(",")[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes.buffer);
}

/**
 * @param {string} markup
 * @returns {string}
 */
function prepareSvgMarkupForPrint(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  const svg = template.content.querySelector("svg");
  if (!svg) return markup;
  svg.setAttribute("width", "105mm");
  svg.setAttribute("height", "148mm");
  svg.setAttribute(
    "style",
    "display:block;width:105mm;height:148mm;margin:0;padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact",
  );
  svg.classList.remove("border");
  return svg.outerHTML;
}

const PRINT_STYLE_ID = "quartierfarben-print-style";

const PRINT_STYLE_CSS = `
  @page {
    size: A6 portrait;
    margin: 0;
  }
  @media print {
    html.quartierfarben-printing,
    body.quartierfarben-printing {
      width: 105mm !important;
      height: 148mm !important;
      max-width: 105mm !important;
      max-height: 148mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    body.quartierfarben-printing *:not(#quartierfarben-print-root):not(#quartierfarben-print-root *) {
      display: none !important;
    }
    body.quartierfarben-printing #quartierfarben-print-root {
      display: block !important;
      visibility: visible !important;
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 105mm !important;
      height: 148mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      break-before: avoid !important;
      break-after: avoid !important;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    body.quartierfarben-printing #quartierfarben-print-root svg,
    body.quartierfarben-printing #quartierfarben-print-root svg.postcard {
      display: block !important;
      width: 105mm !important;
      height: 148mm !important;
      min-width: 105mm !important;
      min-height: 148mm !important;
      max-width: 105mm !important;
      max-height: 148mm !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
  }
`;

function buildIsolatedPrintHtml(svgMarkup) {
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title></title>` +
    `<style>
        @page { size: A6 portrait; margin: 0; }
        html, body {
          margin: 0;
          padding: 0;
          width: 105mm;
          height: 148mm;
          overflow: hidden;
        }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        svg {
          display: block;
          width: 105mm;
          height: 148mm;
          margin: 0;
          padding: 0;
        }
      </style></head><body>${svgMarkup}</body></html>`
  );
}

/**
 * Print from a one-page iframe document (no extra tab, no blank page 2).
 * @param {string} svgMarkup
 */
function printFromIsolatedFrame(svgMarkup) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:105mm;height:148mm;border:0;margin:0;padding:0";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    printFromMainDocument(svgMarkup);
    return;
  }

  const doc = win.document;
  doc.open();
  doc.write(buildIsolatedPrintHtml(svgMarkup));
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      iframe.remove();
    } catch {
      // ignore
    }
    win.onafterprint = null;
  };
  win.onafterprint = cleanup;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        win.focus();
        win.print();
        setTimeout(cleanup, 1200);
      }, 140);
    });
  });
}

/**
 * @param {string} frontMarkup
 */
function printFromMainDocument(frontMarkup) {
  const existing = document.getElementById(PRINT_ROOT_ID);
  if (existing) existing.remove();

  const existingStyle = document.getElementById(PRINT_STYLE_ID);
  if (existingStyle) existingStyle.remove();

  const printStyle = document.createElement("style");
  printStyle.id = PRINT_STYLE_ID;
  printStyle.textContent = PRINT_STYLE_CSS;
  document.head.appendChild(printStyle);

  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  root.innerHTML = prepareSvgMarkupForPrint(frontMarkup);
  document.body.appendChild(root);
  document.documentElement.classList.add(PRINTING_CLASS);
  document.body.classList.add(PRINTING_CLASS);

  const savedTitle = document.title;
  document.title = "";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = savedTitle;
    document.documentElement.classList.remove(PRINTING_CLASS);
    document.body.classList.remove(PRINTING_CLASS);
    root.remove();
    printStyle.remove();
    window.onafterprint = null;
  };

  window.onafterprint = cleanup;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setTimeout(cleanup, 1200);
      }, 140);
    });
  });
}

/**
 * Opens the print dialog for the postcard front (A6 / 105×148 mm) in the current tab.
 * @param {string} frontB64 from {@link encodeFrontSvgForExport}
 */
export function printPostcardFront(frontB64) {
  if (!browser || !frontB64) return;
  const markup = prepareSvgMarkupForPrint(decodeSvgMarkupFromB64(frontB64));
  printFromIsolatedFrame(markup);
}

/**
 * Triggers download of the front postcard SVG (with embedded Fira Mono).
 * @param {import("d3-selection").Selection<SVGSVGElement, unknown, null, undefined>} svgSelection
 * @param {string} filename without extension
 */
export function downloadFrontSvg(svgSelection, filename) {
  if (!browser) return;
  let frontB64;
  try {
    frontB64 = encodeFrontSvgForExport(svgSelection);
  } catch {
    return;
  }
  if (!frontB64) return;
  const filePath = "data:image/svg+xml;base64,\n" + frontB64;
  const a = document.createElement("a");
  a.href = filePath;
  a.download = `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
