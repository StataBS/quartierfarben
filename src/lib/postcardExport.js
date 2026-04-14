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
 * @returns {{ contentWindow: Window, dispose: () => void } | null}
 */
export function createPrintTargetForUserGesture() {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
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

/** @typedef {'A5' | 'A4'} PrintPaperFormat */

/**
 * @param {unknown} v
 * @returns {PrintPaperFormat}
 */
export function normalizePrintPaperFormat(v) {
  return v === "A4" ? "A4" : "A5";
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
          transform: rotate(90deg);
          transform-origin: center center;
        }
        .postcard-back-rotated svg {
          width: 148mm;
          height: 105mm;
          display: block;
        }`;

/**
 * @param {PrintPaperFormat} format
 */
function buildPrintStylesheet(format) {
  const f = normalizePrintPaperFormat(format);
  if (f === "A5") {
    return (
      `@page { size: A5 portrait; margin: 0; }
        .print-page { width: 148mm; min-height: 210mm; overflow: hidden; }
        .postcard-front-wrap,
        .postcard-back-wrap { justify-content: center; align-items: center; padding: 0; }
        ${CUT_BORDER_BLOCK}`
    );
  }
  return (
    `@page { size: A4 portrait; margin: 0; }
        .print-page { width: 210mm; min-height: 297mm; overflow: hidden; }
        .postcard-front-wrap,
        .postcard-back-wrap { justify-content: center; align-items: center; padding: 0; }
        ${CUT_BORDER_BLOCK}`
  );
}

/**
 * @param {string} frontMarkup
 * @param {string} backMarkup
 * @param {PrintPaperFormat} [paperFormat]
 */
function buildTwoPagePostcardPrintHtml(frontMarkup, backMarkup, paperFormat = "A5") {
  const f = normalizePrintPaperFormat(paperFormat);
  const sheet = buildPrintStylesheet(f);
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Postkarte</title>` +
    `<style>
        ${sheet}
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
      </style></head><body data-paper="${f.toLowerCase()}">
        <section class="print-page"><div class="postcard-front-wrap"><div class="postcard-cut-border postcard-cut-border--front">${frontMarkup}</div></div></section>
        <section class="print-page"><div class="postcard-back-wrap"><div class="postcard-cut-border postcard-cut-border--back-shell"><div class="postcard-back-rotated">${backMarkup}</div></div></div></section>
      </body></html>`
  );
}

/**
 * Opens print dialog with two SVG pages (e.g. front + back).
 * @param {string} frontB64 from {@link encode} / {@link encodeFrontSvgForExport}
 * @param {string} backB64
 * @param {{ contentWindow: Window, dispose: () => void } | null} [syncPrintTarget] from {@link createPrintTargetForUserGesture} (same click turn as the button)
 * @param {PrintPaperFormat} [paperFormat] A5 or A4 portrait; postcard centred on the sheet
 */
export function printTwoSvgsFromBase64(frontB64, backB64, syncPrintTarget, paperFormat) {
  return new Promise((resolve, reject) => {
    function decodeSvgMarkup(b64) {
      const dataUrl = "data:image/svg+xml;base64,\n" + b64;
      const svgData = base64DataUrlToArrayBuffer(dataUrl);
      return new TextDecoder("utf-8").decode(svgData);
    }

    const frontMarkup = decodeSvgMarkup(frontB64);
    const backMarkup = decodeSvgMarkup(backB64);
    const html = buildTwoPagePostcardPrintHtml(
      frontMarkup,
      backMarkup,
      normalizePrintPaperFormat(paperFormat),
    );

    const isFirefox = /firefox/i.test(navigator.userAgent);
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
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
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

    // Firefox kiosk can block popup windows; use iframe printing there.
    if (isFirefox) {
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
