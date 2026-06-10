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
 * Hidden iframe for printing. Always use a fresh iframe (not `window.open`): popups often work
 * only once after close, or get blocked on repeat; iframe lifecycle is reliable across prints.
 * Must be created synchronously from a click handler so `print()` runs after `await` prep.
 * Full viewport size (not 0×0): iPad Safari prints the parent page from zero-size iframes.
 * @returns {{ contentWindow: Window, dispose: () => void } | null}
 */
export function createPrintTargetForUserGesture() {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;border:0;margin:0;padding:0;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(iframe);
  const cw = iframe.contentWindow;
  if (!cw) {
    iframe.remove();
    return null;
  }
  return {
    contentWindow: cw,
    dispose() {
      try {
        iframe.remove();
      } catch {
        // ignore
      }
    },
  };
}

/** @typedef {'A6' | 'A5' | 'A4'} PrintPaperFormat */

/** @type {Record<PrintPaperFormat, [number, number]>} portrait width × height in mm */
const PAPER_SIZES_MM = {
  A6: [105, 148],
  A5: [148, 210],
  A4: [210, 297],
};

/**
 * @param {unknown} v
 * @returns {PrintPaperFormat}
 */
export function normalizePrintPaperFormat(v) {
  if (v === "A6" || v === "A4" || v === "A5") return v;
  return "A5";
}

function isIOSPrintClient() {
  if (!browser) return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function normalizePrintOffsetMm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-20, Math.min(20, n));
}

/** Cut guide: outline so the 105×148 mm card is not shrunk by a border. */
const CUT_BORDER_BLOCK = `
        .postcard-cut-border--front,
        .postcard-cut-border--back-shell {
          outline: 0.35mm dashed #555;
          outline-offset: 0;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .postcard-cut-border--front {
          width: 105mm;
          height: 148mm;
          line-height: 0;
          overflow: hidden;
        }
        .postcard-cut-border--front svg {
          width: 105mm;
          height: 148mm;
          display: block;
        }
        .postcard-cut-border--back-shell {
          width: 105mm;
          height: 148mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .postcard-back-rotated {
          flex: 0 0 auto;
          transform: rotate(270deg);
          transform-origin: center center;
        }
        .postcard-back-rotated svg {
          width: 148mm;
          height: 105mm;
          display: block;
        }`;

const PRINT_PAGE_LAYOUT_CSS = `
        html, body { margin: 0; padding: 0; background: #fff; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .print-page {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
          break-after: page;
          page-break-after: always;
        }
        .print-page:last-of-type {
          break-after: auto;
          page-break-after: auto;
          overflow: visible;
        }
        .postcard-front-wrap,
        .postcard-back-wrap {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .postcard-back-offset {
          transform: translate(var(--back-offset-x), var(--back-offset-y));
        }`;

/**
 * @param {PrintPaperFormat} format
 */
function buildPrintStylesheet(format) {
  const f = normalizePrintPaperFormat(format);
  const [w, h] = PAPER_SIZES_MM[f];
  return (
    `@page { size: ${f} portrait; margin: 0; }
        .print-page { width: ${w}mm; min-height: ${h}mm; overflow: hidden; }
        .postcard-front-wrap,
        .postcard-back-wrap { justify-content: center; align-items: center; padding: 0; }
        ${CUT_BORDER_BLOCK}`
  );
}

/**
 * @param {string} frontMarkup
 * @param {string | null | undefined} backMarkup
 * @param {PrintPaperFormat} [paperFormat]
 * @param {number} [backOffsetXmm]
 * @param {number} [backOffsetYmm]
 */
function buildPostcardPrintHtml(
  frontMarkup,
  backMarkup,
  paperFormat = "A5",
  backOffsetXmm = 0,
  backOffsetYmm = 0,
) {
  const f = normalizePrintPaperFormat(paperFormat);
  const sheet = buildPrintStylesheet(f);
  const offsetX = normalizePrintOffsetMm(backOffsetXmm);
  const offsetY = normalizePrintOffsetMm(backOffsetYmm);
  const frontPage =
    `<section class="print-page"><div class="postcard-front-wrap"><div class="postcard-cut-border postcard-cut-border--front">${frontMarkup}</div></div></section>`;
  const backPage = backMarkup
    ? `<section class="print-page"><div class="postcard-back-wrap"><div class="postcard-cut-border postcard-cut-border--back-shell postcard-back-offset"><div class="postcard-back-rotated">${backMarkup}</div></div></div></section>`
    : "";
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Postkarte</title>` +
    `<style>
        ${sheet}
        ${PRINT_PAGE_LAYOUT_CSS}
      </style></head><body data-paper="${f.toLowerCase()}" style="--back-offset-x:${offsetX}mm;--back-offset-y:${offsetY}mm;">
        ${frontPage}${backPage}
      </body></html>`
  );
}

/**
 * Opens print dialog with one or two SVG pages (front only, or front + back).
 * @param {string} frontB64 from {@link encode} / {@link encodeFrontSvgForExport}
 * @param {string | null | undefined} backB64 omit for front-only print
 * @param {{ contentWindow: Window, dispose: () => void } | null} [syncPrintTarget] from {@link createPrintTargetForUserGesture} (same click turn as the button)
 * @param {PrintPaperFormat} [paperFormat] A6, A5, or A4 portrait; postcard centred on the sheet
 * @param {number} [backOffsetXmm] manual duplex registration correction in mm
 * @param {number} [backOffsetYmm] manual duplex registration correction in mm
 */
export function printPostcardFromBase64(
  frontB64,
  backB64,
  syncPrintTarget,
  paperFormat,
  backOffsetXmm = 0,
  backOffsetYmm = 0,
) {
  return new Promise((resolve, reject) => {
    function decodeSvgMarkup(b64) {
      const dataUrl = "data:image/svg+xml;base64,\n" + b64;
      const svgData = base64DataUrlToArrayBuffer(dataUrl);
      return new TextDecoder("utf-8").decode(svgData);
    }

    const frontMarkup = decodeSvgMarkup(frontB64);
    const backMarkup = backB64 ? decodeSvgMarkup(backB64) : null;
    const html = buildPostcardPrintHtml(
      frontMarkup,
      backMarkup,
      normalizePrintPaperFormat(paperFormat),
      backOffsetXmm,
      backOffsetYmm,
    );

    const isFirefox = /firefox/i.test(navigator.userAgent);
    const useIframeFallback = isFirefox || isIOSPrintClient();
    let resolved = false;

    const complete = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    const fail = (error) => {
      if (resolved) return;
      resolved = true;
      if (syncPrintTarget) {
        try {
          syncPrintTarget.dispose();
        } catch {
          // ignore
        }
      }
      reject(error);
    };

    function printFromWindow(
      printWindow,
      shouldCloseWindow = false,
      onAfterPrint = null,
      runDisposeAfterComplete = false,
    ) {
      const doc = printWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      const afterPrint = () => {
        printWindow.onafterprint = null;
        if (shouldCloseWindow) {
          try {
            printWindow.close();
          } catch {
            // ignore close errors
          }
        }
        if (typeof onAfterPrint === "function") {
          onAfterPrint();
        }
        if (runDisposeAfterComplete && syncPrintTarget) {
          try {
            syncPrintTarget.dispose();
          } catch {
            // ignore
          }
        }
        complete();
      };
      printWindow.onafterprint = afterPrint;

      // Wait for layout to settle before opening the print dialog.
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(() => {
          printWindow.focus();
          setTimeout(() => {
            try {
              printWindow.print();
              // Fallback for environments where onafterprint is not fired.
              setTimeout(() => {
                if (runDisposeAfterComplete && syncPrintTarget && !resolved) {
                  try {
                    syncPrintTarget.dispose();
                  } catch {
                    // ignore
                  }
                }
                complete();
              }, 1200);
            } catch (error) {
              fail(error instanceof Error ? error : new Error("print failed"));
            }
          }, 140);
        });
      });
    }

    function printFromIframe() {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;border:0;margin:0;padding:0;opacity:0;pointer-events:none;z-index:-1";
      document.body.appendChild(iframe);

      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        iframe.remove();
        fail(new Error("print: iframe unavailable"));
        return;
      }

      try {
        printFromWindow(frameWindow, false, () => iframe.remove());
      } catch (error) {
        iframe.remove();
        fail(error instanceof Error ? error : new Error("print failed"));
      }
    }

    if (syncPrintTarget) {
      try {
        printFromWindow(
          syncPrintTarget.contentWindow,
          false,
          null,
          true,
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error("print failed"));
      }
      return;
    }

    // Firefox and iPad Safari: popups and zero-size iframes are unreliable.
    if (useIframeFallback) {
      printFromIframe();
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      printFromIframe();
      return;
    }
    printFromWindow(printWindow, true);
  });
}

/**
 * Opens print dialog with front SVG only.
 * @param {string} frontB64
 * @param {{ contentWindow: Window, dispose: () => void } | null} [syncPrintTarget]
 * @param {PrintPaperFormat} [paperFormat]
 */
export function printOneSvgFromBase64(frontB64, syncPrintTarget, paperFormat) {
  return printPostcardFromBase64(
    frontB64,
    null,
    syncPrintTarget,
    paperFormat,
  );
}

/**
 * Opens print dialog with two SVG pages (front + back).
 * @param {string} frontB64
 * @param {string} backB64
 * @param {{ contentWindow: Window, dispose: () => void } | null} [syncPrintTarget]
 * @param {PrintPaperFormat} [paperFormat]
 * @param {number} [backOffsetXmm]
 * @param {number} [backOffsetYmm]
 */
export function printTwoSvgsFromBase64(
  frontB64,
  backB64,
  syncPrintTarget,
  paperFormat,
  backOffsetXmm = 0,
  backOffsetYmm = 0,
) {
  return printPostcardFromBase64(
    frontB64,
    backB64,
    syncPrintTarget,
    paperFormat,
    backOffsetXmm,
    backOffsetYmm,
  );
}
