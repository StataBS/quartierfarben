import { browser } from "$app/environment";
import { get } from "svelte/store";
import { encode } from "$assets/scripts/base64";
import font from "$assets/scripts/font";
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
  titleText.attr("opacity", 1);
  try {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.setAttribute("class", "font-outfit-export-temp");
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.type = "text/css";
    style.innerHTML = font("Outfit");
    defs.appendChild(style);
    svgSelection.node().appendChild(defs);
    return encode(svgSelection.node().outerHTML);
  } finally {
    if (prevOpacity == null || prevOpacity === "") {
      titleText.attr("opacity", null);
    } else {
      titleText.attr("opacity", prevOpacity);
    }
    svgSelection.select("defs.font-outfit-export-temp").remove();
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
 * @param {string} frontMarkup
 * @returns {string}
 */
function buildFrontPrintHtml(frontMarkup) {
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Postkarte</title>` +
    `<style>
        @page { size: 105mm 148mm; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .postcard-cut-border {
          width: 105mm;
          height: 148mm;
          line-height: 0;
          overflow: hidden;
          outline: 0.35mm dashed #555;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .postcard-cut-border svg {
          width: 105mm;
          height: 148mm;
          display: block;
        }
      </style></head><body>
        <div class="postcard-cut-border">${frontMarkup}</div>
      </body></html>`
  );
}

/**
 * @param {Window} printWindow
 * @param {string} html
 */
function printFromPopupWindow(printWindow, html) {
  const doc = printWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  printWindow.onafterprint = () => {
    printWindow.onafterprint = null;
    try {
      printWindow.close();
    } catch {
      // ignore
    }
  };

  printWindow.requestAnimationFrame(() => {
    printWindow.requestAnimationFrame(() => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
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

  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  root.innerHTML = frontMarkup;
  document.body.appendChild(root);
  document.body.classList.add(PRINTING_CLASS);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove(PRINTING_CLASS);
    root.remove();
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
 * Opens a blank print window. Call synchronously at the start of a click handler
 * (before any encoding work) so popup blockers allow it.
 * @returns {Window | null}
 */
export function openPrintWindowForUserGesture() {
  if (!browser) return null;
  return window.open("", "_blank", "noopener,noreferrer");
}

/**
 * Opens the print dialog for the postcard front (A6 / 105×148 mm).
 * @param {string} frontB64 from {@link encodeFrontSvgForExport}
 * @param {Window | null} [printWindow] from {@link openPrintWindowForUserGesture}
 */
export function printPostcardFront(frontB64, printWindow = null) {
  if (!browser || !frontB64) {
    if (printWindow) {
      try {
        printWindow.close();
      } catch {
        // ignore
      }
    }
    return;
  }

  const frontMarkup = decodeSvgMarkupFromB64(frontB64);
  const html = buildFrontPrintHtml(frontMarkup);

  if (printWindow) {
    printFromPopupWindow(printWindow, html);
    return;
  }

  printFromMainDocument(frontMarkup);
}
