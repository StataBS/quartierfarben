<script>
  // https://github.com/rob-balfre/svelte-select/tree/feature/v5
  import Select from "svelte-select";

  import loadOptions from "./requestAddress.js";
  import { newBounds, lang } from "$lib/stores.js";

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

  let selectedSearchResult;

  function handleSelect(event) {
    const placeCoordinates = [event.detail.lon, event.detail.lat];
    $newBounds = placeCoordinates;

    selectedSearchResult = JSON.parse(JSON.stringify(event.detail));
  }

  function handelClear() {
    selectedSearchResult = null;
  }
</script>

<div class="address-search-dds">
  <Select
    class="dds-address-select"
    {loadOptions}
    hideEmptyState={true}
    loadOptionsInterval={1500}
    placeholder={appText.inputs.search}
    on:select={handleSelect}
    on:clear={handelClear}
    label="display_name"
    value={selectedSearchResult}
  >
    <!--<div slot="empty" class="empty">{appText.inputs.noSearchResults}</div>-->
  </Select>
</div>

<style>
  /* Plain CSS: svelte-preprocess Tailwind does not load the full DDS preset */
  :global(.address-search-dds .dds-address-select.svelte-select) {
    width: 100%;
    min-height: 46px;
    border: 1px solid #1e4557;
    border-radius: 4px;
    background: #fff;
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }

  :global(.address-search-dds .dds-address-select.svelte-select:hover) {
    border-color: #0e81a7;
  }

  :global(.address-search-dds .dds-address-select.svelte-select.focused) {
    border-color: #9156b4;
    box-shadow: 0 0 10px 0 #9156b4;
    outline: none;
  }

  :global(.address-search-dds .dds-address-select.svelte-select input) {
    font-size: 1rem;
    line-height: 1.375rem;
    color: #333333;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  :global(.address-search-dds .dds-address-select.svelte-select input:focus) {
    outline: none;
  }

  :global(.address-search-dds .dds-address-select .selected-item) {
    color: #333333;
  }

  :global(.address-search-dds .dds-address-select .svelte-select-list) {
    margin-top: 8px;
    max-height: 16rem;
    overflow-y: auto;
    z-index: 320;
    border: 1px solid #1e4557;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
  }

  :global(.address-search-dds .dds-address-select .list-item .item) {
    padding: 10px;
    color: #146c8b;
    cursor: pointer;
  }

  :global(.address-search-dds .dds-address-select .list-item .item:hover),
  :global(.address-search-dds .dds-address-select .list-item .item.hover) {
    color: #1e4557;
    background: #f8f8f8;
  }

  :global(.address-search-dds .dds-address-select .list-item .item.active) {
    font-weight: 700;
    color: #1e4557;
    background: #ebebeb;
  }

  :global(.address-search-dds .dds-address-select .icon.chevron),
  :global(.address-search-dds .dds-address-select .icon.clear-select) {
    color: #1e4557;
  }
</style>
