<script>
  import { onMount } from "svelte";
  import { selectedAreaFeature, analysisMode } from "$lib/stores.js";
  import { lang } from "$lib/stores.js";
  import { areaModes, getPolygonAreaModes, getAreaModeConfig, CIRCLE_MODE_ID } from "$lib/cityConfig.js";
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

  const polygonModes = getPolygonAreaModes();

  // Initialize from URL parameters (e.g. ?wahlkreis=3 or ?wohnviertel=xyz)
  onMount(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    let matched = false;

    for (const mode of polygonModes) {
      if (urlParams.has(mode.id)) {
        const idParam = urlParams.get(mode.id);
        let feature = mode.data.features.find(
          (f) => String(f.properties[mode.idProperty]) === String(idParam)
        );
        if (!feature && mode.data.features.length > 0) {
          feature = mode.data.features[0];
        }
        if (feature) {
          $selectedAreaFeature = feature;
          $analysisMode = mode.id;
          matched = true;
          if (window.location.hash) {
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          }
          updateURL();
        }
        break;
      }
    }

    if (!matched) {
      $selectedAreaFeature = null;
      $analysisMode = CIRCLE_MODE_ID;
      updateURL();
    }
  });

  function updateURL() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(window.location.search);
    polygonModes.forEach((m) => params.delete(m.id));
    params.delete("mode");
    const modeConfig = getAreaModeConfig($analysisMode);
    if (modeConfig && modeConfig.id !== CIRCLE_MODE_ID && $selectedAreaFeature) {
      const idVal = $selectedAreaFeature.properties[modeConfig.idProperty];
      if (idVal != null) params.set(modeConfig.id, idVal);
    }
    const queryString = params.toString() ? "?" + params.toString() : "";
    const hasPolygonMode = $analysisMode !== CIRCLE_MODE_ID;
    const hash = hasPolygonMode ? "" : url.hash;
    const newUrl = url.origin + url.pathname + queryString + hash;
    window.history.replaceState({}, "", newUrl);
  }

  function handleAreaChange(mode, value) {
    if (value === "") {
      $selectedAreaFeature = null;
      $analysisMode = CIRCLE_MODE_ID;
      updateURL();
    } else {
      const feature = mode.data.features.find(
        (f) => String(f.properties[mode.idProperty]) === String(value)
      );
      if (feature) {
        $selectedAreaFeature = feature;
        $analysisMode = mode.id;
        updateURL();
      }
    }
  }
</script>

{#if $analysisMode !== CIRCLE_MODE_ID}
  <div class="mb-5">
    {#each polygonModes as mode}
      {#if $analysisMode === mode.id}
        <label class="label" for="area-select-{mode.id}">
          <span class="label-text">{appText.inputs[mode.labelKey] || mode.labelKey}</span>
        </label>
        <select
          id="area-select-{mode.id}"
          class="select select-bordered w-full"
          on:change={(e) => handleAreaChange(mode, e.currentTarget.value)}
        >
          <option value="">{appText.inputs[mode.selectLabelKey] || ("Select " + mode.labelKey)}</option>
          {#each mode.data.features as feature}
            <option
              value={feature.properties[mode.idProperty]}
              selected={$selectedAreaFeature?.properties?.[mode.idProperty] === feature.properties[mode.idProperty]}
            >
              {feature.properties[mode.nameProperty]}
            </option>
          {/each}
        </select>
      {/if}
    {/each}
  </div>
{/if}
