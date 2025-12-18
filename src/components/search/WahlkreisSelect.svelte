<script>
  import { selectedWahlkreis, analysisMode } from "$lib/stores.js";
  import { lang } from "$lib/stores.js";
  import wahlkreiseData from "$lib/wahlkreise.js";
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
</script>

<div class="mb-5">
  <label class="label">
    <span class="label-text">{appText.inputs.wahlkreis || "Wahlkreis"}</span>
  </label>
  <select
    class="select select-bordered w-full"
    on:change={(e) => {
      const selectedValue = e.target.value;
      if (selectedValue === "circle") {
        $selectedWahlkreis = null;
        $analysisMode = "circle";
      } else {
        const feature = wahlkreiseData.features.find(f => f.properties.objid.toString() === selectedValue);
        if (feature) {
          $selectedWahlkreis = feature;
          $analysisMode = "wahlkreis";
        }
      }
    }}
  >
    <option value="circle" selected={$analysisMode === "circle"}>
      {appText.inputs.useCircle || "Use circle"}
    </option>
    {#each wahlkreiseData.features as feature}
      <option
        value={feature.properties.objid}
        selected={$selectedWahlkreis?.properties?.objid === feature.properties.objid}
      >
        {feature.properties.wahlkreis}
      </option>
    {/each}
  </select>
</div>

