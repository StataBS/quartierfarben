<script>
  import { textVis, lang } from "$lib/stores.js";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  $: appText = $lang === "en" ? en : de;
  $: placeholder = appText.inputs.postcardPlaceholder;
  $: labelText = appText.inputs.postcardLabel;
</script>

<div class="flex w-full flex-col gap-[0.5rem]">
  <label
    class="label !m-0 block text-base leading-snug text-gray-900"
    for="postcard-text-input"
  >
    {labelText}
  </label>
  <input
    id="postcard-text-input"
    type="text"
    bind:value={$textVis}
    placeholder={placeholder}
    class="input w-full"
  />
</div>
