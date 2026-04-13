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
    titleText.attr("opacity", 0);
    svgSelection.select("defs.font-outfit-export-temp").remove();
  }
}

function base64DataUrlToArrayBuffer(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Opens print dialog with two SVG pages (e.g. front + back).
 * @param {string} frontB64 from {@link encode} / {@link encodeFrontSvgForExport}
 * @param {string} backB64
 */
export function printTwoSvgsFromBase64(frontB64, backB64) {
  return new Promise((resolve, reject) => {
    const pages = /** @type {(HTMLElement | null)[]} */ ([null, null]);
    let decoded = 0;

    function tryPrint() {
      if (decoded < 2) return;
      if (!pages[0] || !pages[1]) {
        reject(new Error("print: failed to decode SVG"));
        return;
      }
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        reject(new Error("print: popup blocked"));
        return;
      }
      printWindow.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Postkarte</title>` +
          `<style>
            @media print {
              .postcard-page { page-break-after: always; break-after: page; }
              .postcard-page:last-of-type { page-break-after: auto; break-after: auto; }
            }
            body { margin: 0; background: #fff; }
            .postcard-page {
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; box-sizing: border-box; padding: 6mm;
            }
            .postcard-page svg { max-width: 100%; height: auto; }
          </style></head><body></body></html>`,
      );
      printWindow.document.close();
      printWindow.document.body.appendChild(pages[0]);
      printWindow.document.body.appendChild(pages[1]);
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      resolve();
    }

    function loadOne(b64, index) {
      const dataUrl = "data:image/svg+xml;base64,\n" + b64;
      const svgData = base64DataUrlToArrayBuffer(dataUrl);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const reader = new FileReader();
      reader.readAsText(blob);
      reader.onloadend = function () {
        const wrap = document.createElement("div");
        wrap.className = "postcard-page";
        wrap.innerHTML = reader.result;
        pages[index] = wrap;
        decoded++;
        tryPrint();
      };
      reader.onerror = () => reject(reader.error);
    }

    loadOne(frontB64, 0);
    loadOne(backB64, 1);
  });
}
