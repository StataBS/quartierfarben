<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { svg, dimensions, lang, printBackUI } from "$lib/stores.js";
  import font from "$assets/scripts/font";
  import { encode } from "$assets/scripts/base64";
  import { downloadFilename, backsideSuffix } from "$lib/settings.js";
  import {
    preparePostcardBackForExport,
    encodeFrontSvgForExport,
    printPostcardFront,
    downloadFrontSvg,
  } from "$lib/postcardExport.js";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  function syncPrintModeFromUrl() {
    if (!browser) return;
    const kiosk = new URLSearchParams(window.location.search).has("kiosk");
    $printBackUI = !kiosk;
  }

  onMount(() => {
    syncPrintModeFromUrl();
    window.addEventListener("popstate", syncPrintModeFromUrl);
    return () => {
      window.removeEventListener("popstate", syncPrintModeFromUrl);
    };
  });

  let appText = {};
  $: {
    if ($lang === "en") {
      appText = en;
    } else {
      appText = de;
    }
  }

  const width = $dimensions[0];
  const height = $dimensions[1];

  function downloadSVG(svg, suffix) {
    var b64;
    if (svg._groups) {
      b64 = encode(svg.node().outerHTML);
    } else {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const style = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "style",
      );
      style.type = "text/css";
      // prettier-ignore
      style.innerHTML = font('Outfit');
      defs.appendChild(style);
      svg.appendChild(defs);
      b64 = encode(svg.outerHTML);
    }

    var file_path = "data:image/svg+xml;base64,\n" + b64;

    var a = document.createElement("A");
    a.href = file_path;
    a.download = `${downloadFilename + (suffix || "")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // not in use
  function downloadPNG(svg) {
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

  function printOrDownloadFront() {
    if ($printBackUI) {
      downloadFrontSvg($svg, downloadFilename);
      return;
    }
    let frontB64;
    try {
      frontB64 = encodeFrontSvgForExport($svg);
    } catch {
      return;
    }
    printPostcardFront(frontB64);
  }
</script>

<!-- Kanton BS symbol: designsystem/dist/assets/symbols/download.svg -->
<div class="flex w-full flex-col gap-[1.25rem]">
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
