<script>
  import { lang, showCoordinates } from "$lib/stores.js";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  let appText = {};
  $: appText = $lang === "en" ? en : de;
</script>

<div class="w-full">
  <label
    class="label !m-0 !inline-flex !w-auto !max-w-full !flex-row !flex-nowrap !items-center !justify-start !gap-[0.625rem] !pb-0 cursor-pointer"
  >
    <span class="shrink text-base leading-snug text-gray-900"
      >{appText.inputs.showCoordinates}</span
    >
    <span class="toggle-switch shrink-0">
      <input
        type="checkbox"
        class="toggle-switch-input"
        bind:checked={$showCoordinates}
      />
    </span>
  </label>
</div>
