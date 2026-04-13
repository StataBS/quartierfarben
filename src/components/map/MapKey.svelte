<!-- map legend: use explicit px/rem — DDS Tailwind spacing differs from default Tailwind -->

<script>
  import { lang, isMobile } from "$lib/stores.js";
  import { categories } from "$lib/settings.js";
</script>

<div
  class="map-legend pointer-events-auto inline-block"
  class:z-20={!$isMobile}
  class:absolute={!$isMobile}
  class:relative={$isMobile}
  class:map-legend--desktop={!$isMobile}
  style={$isMobile
    ? ""
    : "max-width: min(38rem, max(14rem, calc(100% - 22rem)));"}
  class:my-[1rem]={$isMobile}
  class:mx-0={$isMobile}
>
  {#each Object.values(categories) as { color, name, name_en }, i}
    <div class="map-legend-item inline-block align-middle">
      <div
        class="map-legend-swatch rounded-full ml-2 inline-block"
        style="width:16px;height:16px;min-width:16px;min-height:16px;background-color:{color};border:1.5px solid white;"
      />
      <p
        class="map-legend-text align-middle leading-4 ml-1 inline-block mb-2"
        style="text-shadow: 2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff,
      1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff;"
      >
        {$lang === "de" ? name : name_en}
      </p>
    </div>
  {/each}
</div>

<style>
  /* Below postcard (z-40) and zoom (z-40); above map (z-0) */
  .map-legend--desktop {
    left: calc(var(--sidebar-overlay-w, 0px) + 8px);
    bottom: 16px;
  }

  .map-legend-text {
    color: #333333;
    font-size: 0.875rem;
    line-height: 1rem;
  }

  .map-legend--desktop .map-legend-text {
    font-size: 0.9375rem;
    line-height: 1.125rem;
  }

  .map-legend-item {
    margin-right: 10px;
    margin-bottom: 8px;
  }

  .map-legend--desktop .map-legend-item {
    margin-right: 12px;
  }
</style>
