<script>
  import { selectedAreaFeature, analysisMode } from "$lib/stores.js";
  import { lang } from "$lib/stores.js";
  import { getAreaModeConfig, CIRCLE_MODE_ID } from "$lib/cityConfig.js";
  import en from "$locales/en.json";
  import de from "$locales/de.json";

  const wahlkreisMode = getAreaModeConfig("wahlkreis");
  const wahlkreiseData = wahlkreisMode?.data;

  let appText = {};
  $: {
    if ($lang === 'en') {
      appText = en;
    } else {
      appText = de;
    }
  }
</script>

{#if wahlkreiseData}
  <div class="mb-5">
    <label class="label">
      <span class="label-text">{appText.inputs.wahlkreis || "Wahlkreis"}</span>
    </label>
    <select
      class="select select-bordered w-full"
      on:change={(e) => {
        const selectedValue = e.target.value;
        if (selectedValue === CIRCLE_MODE_ID) {
          $selectedAreaFeature = null;
          $analysisMode = CIRCLE_MODE_ID;
        } else {
          const feature = wahlkreiseData.features.find(
            (f) => String(f.properties[wahlkreisMode.idProperty]) === String(selectedValue)
          );
          if (feature) {
            $selectedAreaFeature = feature;
            $analysisMode = "wahlkreis";
          }
        }
      }}
    >
      <option value={CIRCLE_MODE_ID} selected={$analysisMode === CIRCLE_MODE_ID}>
        {appText.inputs.useCircle || "Use circle"}
      </option>
      {#each wahlkreiseData.features as feature}
        <option
          value={feature.properties[wahlkreisMode.idProperty]}
          selected={$selectedAreaFeature?.properties?.[wahlkreisMode.idProperty] === feature.properties[wahlkreisMode.idProperty]}
        >
          {feature.properties[wahlkreisMode.nameProperty]}
        </option>
      {/each}
    </select>
  </div>
{/if}
