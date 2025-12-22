<script>
  import { onMount } from "svelte";
  import { selectedWahlkreis, selectedWohnviertel, analysisMode } from "$lib/stores.js";
  import { lang } from "$lib/stores.js";
  import wahlkreiseData from "$lib/wahlkreise.js";
  import wohnviertelData from "$lib/wohnviertel.js";
  import en from "$locales/en.json";
  import de from "$locales/de.json";

  let appText = {};
  $: {
    if ($lang === 'en') {
      appText = en;
    } else {
      appText = de;
    }
  }

  // Initialize from URL parameters
  onMount(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasWahlkreis = urlParams.has("wahlkreis");
      const hasWohnviertel = urlParams.has("wohnviertel");

      if (hasWahlkreis) {
        // Select first wahlkreis by default, or find by ID if provided
        const wahlkreisId = urlParams.get("wahlkreis");
        let feature;
        if (wahlkreisId && wahlkreisId !== "1") {
          feature = wahlkreiseData.features.find(f => f.properties.objid.toString() === wahlkreisId);
        }
        // If no ID or not found, use first one
        if (!feature && wahlkreiseData.features.length > 0) {
          feature = wahlkreiseData.features[0];
        }
        if (feature) {
          $selectedWahlkreis = feature;
          $selectedWohnviertel = null;
          $analysisMode = "wahlkreis";
          // Remove hash immediately
          if (window.location.hash) {
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          }
          updateURL();
        }
      } else if (hasWohnviertel) {
        // Select first wohnviertel by default, or find by ID if provided
        const wohnviertelId = urlParams.get("wohnviertel");
        let feature;
        if (wohnviertelId && wohnviertelId !== "1") {
          feature = wohnviertelData.features.find(f => f.properties.wov_id === wohnviertelId);
        }
        // If no ID or not found, use first one
        if (!feature && wohnviertelData.features.length > 0) {
          feature = wohnviertelData.features[0];
        }
        if (feature) {
          $selectedWohnviertel = feature;
          $selectedWahlkreis = null;
          $analysisMode = "wohnviertel";
          // Remove hash immediately
          if (window.location.hash) {
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          }
          updateURL();
        }
      } else {
        // Default to circle mode
        $selectedWahlkreis = null;
        $selectedWohnviertel = null;
        $analysisMode = "circle";
        updateURL();
      }
    }
  });

  function updateURL() {
    const url = new URL(window.location.href);
    
    // Build query string manually to avoid = sign
    const params = [];
    
    if ($analysisMode === "wahlkreis") {
      params.push("wahlkreis");
    } else if ($analysisMode === "wohnviertel") {
      params.push("wohnviertel");
    }
    
    // Preserve kiosk param (also without = sign)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("kiosk")) {
      params.push("kiosk");
    }
    
    // Preserve other params that might have values
    const otherParams = new URLSearchParams(window.location.search);
    otherParams.delete("mode");
    otherParams.delete("wahlkreis");
    otherParams.delete("wohnviertel");
    otherParams.delete("kiosk");
    
    // Add other params that have values
    for (const [key, value] of otherParams.entries()) {
      if (value) {
        params.push(`${key}=${value}`);
      }
    }
    
    const queryString = params.length > 0 ? "?" + params.join("&") : "";
    
    // Remove hash (coordinates) when in wahlkreis/wohnviertel mode
    const hash = ($analysisMode === "wahlkreis" || $analysisMode === "wohnviertel") ? "" : url.hash;
    
    const newUrl = url.origin + url.pathname + queryString + hash;
    window.history.replaceState({}, "", newUrl);
  }

  function handleWahlkreisChange(value) {
    if (value === "") {
      // Switch back to circle mode when deselecting
      $selectedWahlkreis = null;
      $analysisMode = "circle";
      updateURL();
    } else {
      const feature = wahlkreiseData.features.find(f => f.properties.objid.toString() === value);
      if (feature) {
        $selectedWahlkreis = feature;
        $selectedWohnviertel = null;
        $analysisMode = "wahlkreis";
        updateURL();
      }
    }
  }

  function handleWohnviertelChange(value) {
    if (value === "") {
      // Switch back to circle mode when deselecting
      $selectedWohnviertel = null;
      $analysisMode = "circle";
      updateURL();
    } else {
      const feature = wohnviertelData.features.find(f => f.properties.wov_id === value);
      if (feature) {
        $selectedWohnviertel = feature;
        $selectedWahlkreis = null;
        $analysisMode = "wohnviertel";
        updateURL();
      }
    }
  }
</script>

{#if $analysisMode !== "circle"}
  <div class="mb-5">
    {#if $analysisMode === "wahlkreis"}
      <label class="label" for="wahlkreis-select">
        <span class="label-text">{appText.inputs.wahlkreis || "Wahlkreis"}</span>
      </label>
      <select
        id="wahlkreis-select"
        class="select select-bordered w-full"
        on:change={(e) => handleWahlkreisChange(e.target.value)}
      >
        <option value="">{appText.inputs.selectWahlkreis || "Select Wahlkreis"}</option>
        {#each wahlkreiseData.features as feature}
          <option
            value={feature.properties.objid}
            selected={$selectedWahlkreis?.properties?.objid === feature.properties.objid}
          >
            {feature.properties.wahlkreis}
          </option>
        {/each}
      </select>
    {/if}

    {#if $analysisMode === "wohnviertel"}
      <label class="label" for="wohnviertel-select">
        <span class="label-text">{appText.inputs.wohnviertel || "Wohnviertel"}</span>
      </label>
      <select
        id="wohnviertel-select"
        class="select select-bordered w-full"
        on:change={(e) => handleWohnviertelChange(e.target.value)}
      >
        <option value="">{appText.inputs.selectWohnviertel || "Select Wohnviertel"}</option>
        {#each wohnviertelData.features as feature}
          <option
            value={feature.properties.wov_id}
            selected={$selectedWohnviertel?.properties?.wov_id === feature.properties.wov_id}
          >
            {feature.properties.wov_name}
          </option>
        {/each}
      </select>
    {/if}
  </div>
{/if}

