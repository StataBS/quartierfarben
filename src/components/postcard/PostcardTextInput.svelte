<script>
  import { textVis } from "$lib/stores.js";
  import { postcardTextPlaceholder } from "$lib/settings.js";
</script>

<div class="flex w-full flex-col gap-[0.5rem]">
  <input
    id="postcard-text-input"
    type="text"
    bind:value={$textVis}
    placeholder={postcardTextPlaceholder}
    class="input w-full"
  />
</div>
