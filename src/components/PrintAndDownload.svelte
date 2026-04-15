<script>
  import { onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  import { svg, dimensions, lang, printBackUI } from "$lib/stores.js";
  import font from "$assets/scripts/font";
  import { encode } from "$assets/scripts/base64";
  import { downloadFilename, backsideSuffix } from "$lib/settings.js";
  import {
    preparePostcardBackForExport,
    encodeFrontSvgForExport,
    printTwoSvgsFromBase64,
    createPrintTargetForUserGesture,
    normalizePrintPaperFormat,
  } from "$lib/postcardExport.js";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  function syncPrintModeFromUrl() {
    if (!browser) return;
    const kiosk = new URLSearchParams(window.location.search).has("kiosk");
    $printBackUI = !kiosk;
  }

  const PRINT_PAPER_STORAGE = "quartierfarben-print-paper";
  const PRINT_BACK_OFFSET_X_STORAGE = "quartierfarben-print-back-offset-x-mm";
  const PRINT_BACK_OFFSET_Y_STORAGE = "quartierfarben-print-back-offset-y-mm";

  /** @type {'A5' | 'A4'} */
  let printPaperSize = "A5";
  let backOffsetXmm = 0;
  let backOffsetYmm = 0;

  onMount(() => {
    syncPrintModeFromUrl();
    if (browser) {
      const saved = localStorage.getItem(PRINT_PAPER_STORAGE);
      printPaperSize = normalizePrintPaperFormat(saved);
      backOffsetXmm = Number(localStorage.getItem(PRINT_BACK_OFFSET_X_STORAGE) ?? 0) || 0;
      backOffsetYmm = Number(localStorage.getItem(PRINT_BACK_OFFSET_Y_STORAGE) ?? 0) || 0;
    }
    function onDocClick(/** @type {MouseEvent} */ e) {
      if (!paperRootEl || !(e.target instanceof Node)) return;
      if (!paperRootEl.contains(e.target)) closePaperMenu();
    }
    function onReposition() {
      if (paperMenuOpen) positionPaperMenu();
    }
    document.addEventListener("click", onDocClick);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("popstate", syncPrintModeFromUrl);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("popstate", syncPrintModeFromUrl);
    };
  });

  function persistPrintPaperSize() {
    if (browser) {
      localStorage.setItem(PRINT_PAPER_STORAGE, printPaperSize);
    }
  }

  function clampBackOffsetMm(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-20, Math.min(20, n));
  }

  function persistBackOffsetX() {
    backOffsetXmm = clampBackOffsetMm(backOffsetXmm);
    if (browser) {
      localStorage.setItem(PRINT_BACK_OFFSET_X_STORAGE, String(backOffsetXmm));
    }
  }

  function persistBackOffsetY() {
    backOffsetYmm = clampBackOffsetMm(backOffsetYmm);
    if (browser) {
      localStorage.setItem(PRINT_BACK_OFFSET_Y_STORAGE, String(backOffsetYmm));
    }
  }

  function formatDirectionalMm(value, negativeWord, positiveWord) {
    const n = clampBackOffsetMm(value);
    const abs = Math.abs(n);
    const mm = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
    if (n === 0) return `0 mm`;
    return `${mm} mm ${n < 0 ? negativeWord : positiveWord}`;
  }

  let paperMenuOpen = false;
  /** @type {HTMLDivElement | undefined} */
  let paperRootEl;
  /** @type {HTMLButtonElement | undefined} */
  let paperTriggerEl;
  let paperMenuTop = 0;
  let paperMenuLeft = 0;
  let paperMenuWidth = 280;

  function closePaperMenu() {
    paperMenuOpen = false;
  }

  /** @param {'A5' | 'A4'} code */
  function pickPaperSize(code) {
    printPaperSize = code;
    persistPrintPaperSize();
    closePaperMenu();
  }

  /** @param {KeyboardEvent} e */
  function onPaperMenuKeydown(e) {
    if (e.key === "Escape") closePaperMenu();
  }

  async function positionPaperMenu() {
    await tick();
    if (!paperMenuOpen || !paperTriggerEl || typeof window === "undefined") return;
    const r = paperTriggerEl.getBoundingClientRect();
    const pad = 6;
    const w = Math.max(r.width, 220);
    paperMenuWidth = w;
    paperMenuTop = r.bottom + pad;
    let left = r.right - w;
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - w - 8);
    }
    paperMenuLeft = left;
  }

  $: if (paperMenuOpen) {
    positionPaperMenu();
  }

  let appText = {};
  $: {
    if ($lang === "en") {
      appText = en;
    } else {
      appText = de;
    }
  }

  $: selectedPaperLabel =
    printPaperSize === "A4"
      ? appText.print?.optionA4 ?? "A4"
      : appText.print?.optionA5 ?? "A5";

  const width = $dimensions[0];
  const height = $dimensions[1];

  function printSVG(base64EncodedSVG) {
    // Convert base64 to ArrayBuffer
    function base64ToArrayBuffer(base64) {
      const binaryString = atob(base64.split(",")[1]);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    // Convert the base64 data URL to a Blob
    const svgData = base64ToArrayBuffer(base64EncodedSVG);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });

    // Create a FileReader to read the Blob as a text
    const reader = new FileReader();
    reader.readAsText(blob);
    reader.onloadend = function () {
      // Create a temporary div element to hold the decoded SVG
      const tempDiv = document.createElement("div");
      tempDiv.style.display = "none";
      tempDiv.innerHTML = reader.result;
      document.body.appendChild(tempDiv);

      // Retrieve the SVG element from the temporary div
      const svgElement = tempDiv.querySelector("svg");

      // Create a new window to display the SVG for printing
      const printWindow = window.open("", "_blank");
      printWindow.document.write(
        '<!DOCTYPE html><html><head><title>Print SVG</title></head><body style="margin:0; padding:0; font-size:0;">',
      );
      printWindow.document.write("</body></html>");
      printWindow.document.close();

      // Append the SVG element to the new window
      printWindow.document.body.appendChild(svgElement);

      // Call the print function
      printWindow.print();

      // Close the new window after printing
      printWindow.close();

      // Remove the temporary div from the document
      document.body.removeChild(tempDiv);
    };
  }

  function downloadSVG(svg, suffix) {
    var b64;
    if (svg._groups) {
      const titleText = svg.selectAll(".title-text");
      titleText.attr("opacity", 1);
      try {
        const defs = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "defs",
        );
        const style = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "style",
        );
        style.type = "text/css";
        // prettier-ignore
        style.innerHTML = font('Outfit');
        defs.appendChild(style);
        svg.node().appendChild(defs);

        b64 = encode(svg.node().outerHTML);
      } finally {
        titleText.attr("opacity", 0);
      }
      //b64 = encodeURIComponent('<?xml version="1.0" encoding="utf-8"?>' + svg.node().outerHTML);
    } else {
      b64 = encode(svg.outerHTML);
      //b64 = encodeURIComponent('<?xml version="1.0" encoding="utf-8"?>' + svg.outerHTML);
    }

    var file_path = "data:image/svg+xml;base64,\n" + b64;
    //var file_path = "data:image/svg+xml," + b64;

    if ($printBackUI) {
      var a = document.createElement("A");
      a.href = file_path;
      a.download = `${downloadFilename + (suffix || "")}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      printSVG(file_path);
    }
  }

  // not in use
  function downloadPNG(svg) {
    //PNG Download
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.type = "text/css";
    // prettier-ignore
    style.innerHTML = font('Outfit');
    defs.appendChild(style);
    svg.node().appendChild(defs);

    var s = new XMLSerializer().serializeToString(svg.node());
    var encodedData = window.btoa(s);

    var b64 = encode(svg.node().outerHTML);

    var image = new Image();
    image.src = "data:image/svg+xml;base64," + b64;
    image.onload = function () {
      var context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      var file_path = canvas.toDataURL("image/png");
      var a = document.createElement("A");
      a.href = file_path;
      a.download = `${downloadFilename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }

  async function downloadSVGback() {
    await preparePostcardBackForExport();
    const svgBack = document.getElementById("postcardBack");
    downloadSVG(svgBack, backsideSuffix);
  }

  async function printOrDownloadFront() {
    if ($printBackUI) {
      downloadSVG($svg);
      return;
    }
    const syncPrintTarget = createPrintTargetForUserGesture();
    if (!syncPrintTarget) {
      return;
    }
    let frontB64;
    let backB64;
    try {
      await preparePostcardBackForExport();
      frontB64 = encodeFrontSvgForExport($svg);
      const backEl = document.getElementById("postcardBack");
      if (!backEl) {
        syncPrintTarget.dispose();
        return;
      }
      backB64 = encode(backEl.outerHTML);
    } catch {
      syncPrintTarget.dispose();
      return;
    }
    await printTwoSvgsFromBase64(
      frontB64,
      backB64,
      syncPrintTarget,
      normalizePrintPaperFormat(printPaperSize),
      clampBackOffsetMm(backOffsetXmm),
      clampBackOffsetMm(backOffsetYmm),
    );
  }
</script>

<svelte:window on:keydown={onPaperMenuKeydown} />

<!-- Kanton BS symbol: designsystem/dist/assets/symbols/download.svg -->
<div class="flex w-full flex-col gap-[1.25rem]">
  {#if !$printBackUI}
    <div class="relative z-30 w-full min-w-0" bind:this={paperRootEl}>
      <button
        bind:this={paperTriggerEl}
        type="button"
        class="print-paper-trigger group/pp button w-full max-w-none shrink-0 justify-between gap-2 text-left"
        data-open={paperMenuOpen ? "true" : undefined}
        aria-expanded={paperMenuOpen}
        aria-haspopup="listbox"
        aria-label={appText.print.paperLabel}
        on:click|stopPropagation={() => (paperMenuOpen = !paperMenuOpen)}
      >
        <span class="flex min-w-0 flex-1 items-center gap-2">
          <svg
            class="print-paper-icon origin-center shrink-0 group-hover/pp:animate-[ds-icon-pop_0.45s_ease]"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span class="min-w-0 truncate">{selectedPaperLabel}</span>
        </span>
        <svg
          class="print-paper-chevron shrink-0 transition-transform duration-150"
          class:print-paper-chevron--open={paperMenuOpen}
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      {#if paperMenuOpen}
        <ul
          class="fixed z-[200] list-none space-y-5 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.1),0_2px_8px_rgba(15,23,42,0.06)] sm:space-y-6 sm:p-7"
          style="top: {paperMenuTop}px; left: {paperMenuLeft}px; width: {paperMenuWidth}px;"
          role="listbox"
          aria-label={appText.print.paperLabel}
        >
          <li role="option" aria-selected={printPaperSize === "A5"}>
            <button
              type="button"
              class="w-full rounded-md px-5 py-5 text-left text-base transition-colors duration-150 hover:bg-purple-50 hover:!text-purple-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 lg:text-[18px] {printPaperSize === 'A5'
                ? 'font-bold text-blue-900'
                : 'font-normal text-gray-600'}"
              on:click={() => pickPaperSize("A5")}
            >
              {appText.print.optionA5}
            </button>
          </li>
          <li role="option" aria-selected={printPaperSize === "A4"}>
            <button
              type="button"
              class="w-full rounded-md px-5 py-5 text-left text-base transition-colors duration-150 hover:bg-purple-50 hover:!text-purple-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 lg:text-[18px] {printPaperSize === 'A4'
                ? 'font-bold text-blue-900'
                : 'font-normal text-gray-600'}"
              on:click={() => pickPaperSize("A4")}
            >
              {appText.print.optionA4}
            </button>
          </li>
        </ul>
      {/if}
    </div>
  {/if}

  <button
    type="button"
    on:click={printOrDownloadFront}
    class="button group/download w-full max-w-none"
  >
    {#if $printBackUI}
      <svg
        class="shrink-0 group-hover/download:animate-jump-y"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 16.667h10M10 3.333v10m0 0 2.917-2.916M10 13.333l-2.917-2.916"
        />
      </svg>
    {:else}
      <svg
        class="h-5 w-5 shrink-0 origin-center group-hover/download:animate-[ds-icon-pop_0.45s_ease]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
    {/if}
    <span
      >{$printBackUI
        ? appText.buttons.downloadFront
        : appText.buttons.printFront}</span
    >
  </button>

  {#if !$printBackUI}
    <p class="m-0 text-sm leading-snug text-gray-700" role="note">
      {appText.print.hint}
    </p>
    <div class="flex w-full flex-col gap-2">
      <p class="m-0 text-sm leading-snug text-gray-700" role="note">
        {appText.print.calibrationIntro}
      </p>
      <div class="grid w-full grid-cols-2 gap-2">
        <label class="flex flex-col gap-1 text-sm text-gray-800">
          <span>{appText.print.calibrationX}</span>
          <input
            type="number"
            step="0.5"
            min="-20"
            max="20"
            inputmode="decimal"
            bind:value={backOffsetXmm}
            on:change={persistBackOffsetX}
            class="input w-full"
          />
          <span class="text-xs text-gray-600">
            {formatDirectionalMm(
              backOffsetXmm,
              $lang === "en" ? "left" : "links",
              $lang === "en" ? "right" : "rechts",
            )}
          </span>
        </label>
        <label class="flex flex-col gap-1 text-sm text-gray-800">
          <span>{appText.print.calibrationY}</span>
          <input
            type="number"
            step="0.5"
            min="-20"
            max="20"
            inputmode="decimal"
            bind:value={backOffsetYmm}
            on:change={persistBackOffsetY}
            class="input w-full"
          />
          <span class="text-xs text-gray-600">
            {formatDirectionalMm(
              backOffsetYmm,
              $lang === "en" ? "up" : "oben",
              $lang === "en" ? "down" : "unten",
            )}
          </span>
        </label>
      </div>
    </div>
  {/if}

  {#if $printBackUI}
    <button
      type="button"
      on:click={downloadSVGback}
      class="button is-inverted group/download-back w-full max-w-none"
    >
      <svg
        class="shrink-0 group-hover/download-back:animate-jump-y"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        ><path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 16.667h10M10 3.333v10m0 0 2.917-2.916M10 13.333l-2.917-2.916"
        /></svg
      >
      <span>{@html appText.buttons.downloadBack}</span>
    </button>
  {/if}
</div>

<style>
  /* Same footprint as primary `.button` (Drucken); open state like other DDS dropdowns. */
  .print-paper-trigger {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
  }

  :global(button.print-paper-trigger.button[data-open="true"]) {
    --button-bg: theme("colors.purple.100");
    --button-border: theme("colors.purple.600");
    --button-text: theme("colors.purple.900");
  }

  :global(button.print-paper-trigger.button[data-open="true"]:hover),
  :global(button.print-paper-trigger.button[data-open="true"]:focus-visible) {
    --button-text: theme("colors.purple.900");
  }

  :global(button.print-paper-trigger.button) .print-paper-chevron {
    display: block;
    width: 18px;
    height: 18px;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    color: inherit;
    opacity: 1;
  }

  .print-paper-chevron--open {
    transform: rotate(180deg);
  }

  :global(button.print-paper-trigger.button) .print-paper-icon {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  .print-paper-icon {
    flex-shrink: 0;
  }
</style>
