<script>
  import { onDestroy } from "svelte";
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
  let inputValue = "";
  let suggestions = [];
  let isDropdownOpen = false;
  let highlightedIndex = -1;
  let isInputFocused = false;
  let debounceTimeout;
  let requestId = 0;
  const inputId = "address-search-combobox";
  const listboxId = "address-search-listbox";
  const searchDebounceMs = 300;

  function handleSelect(option) {
    if (!option) {
      return;
    }

    const placeCoordinates = [option.lon, option.lat];
    $newBounds = placeCoordinates;
    selectedSearchResult = JSON.parse(JSON.stringify(option));
    inputValue = option.display_name || "";
    isDropdownOpen = false;
    highlightedIndex = -1;
  }

  function handelClear() {
    selectedSearchResult = null;
    suggestions = [];
    isDropdownOpen = false;
    highlightedIndex = -1;
  }

  function clearSearch() {
    inputValue = "";
    handelClear();
  }

  async function fetchSuggestions(query) {
    const currentRequestId = ++requestId;
    const options = await loadOptions(query);

    if (currentRequestId !== requestId) {
      return;
    }

    suggestions = Array.isArray(options) ? options : [];
    highlightedIndex = suggestions.length ? 0 : -1;
    isDropdownOpen = isInputFocused && suggestions.length > 0;
  }

  function scheduleFetch(query) {
    clearTimeout(debounceTimeout);

    if (!query.trim()) {
      clearSearch();
      return;
    }

    debounceTimeout = setTimeout(() => {
      fetchSuggestions(query).catch(() => {
        suggestions = [];
        isDropdownOpen = false;
        highlightedIndex = -1;
      });
    }, searchDebounceMs);
  }

  function handleInput(event) {
    inputValue = event.currentTarget.value;

    if (!inputValue.trim()) {
      clearSearch();
      return;
    }

    selectedSearchResult = null;
    scheduleFetch(inputValue);
  }

  function handleFocus() {
    isInputFocused = true;
    if (suggestions.length > 0) {
      isDropdownOpen = true;
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      isDropdownOpen = false;
      highlightedIndex = -1;
      return;
    }

    if (!suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      isDropdownOpen = true;
      highlightedIndex = highlightedIndex < suggestions.length - 1 ? highlightedIndex + 1 : 0;
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      isDropdownOpen = true;
      highlightedIndex = highlightedIndex > 0 ? highlightedIndex - 1 : suggestions.length - 1;
      return;
    }

    if (event.key === "Enter" && isDropdownOpen && highlightedIndex >= 0) {
      event.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    }
  }

  function handleWindowClick(event) {
    const isInsideSearch = event.target instanceof Element && event.target.closest(".address-search-dds");

    if (!isInsideSearch) {
      isInputFocused = false;
      isDropdownOpen = false;
      highlightedIndex = -1;
    }
  }

  function handleOptionMouseEnter(index) {
    highlightedIndex = index;
  }

  function handleOptionMouseDown(option) {
    handleSelect(option);
  }

  function getOptionId(index) {
    return `${listboxId}-option-${index}`;
  }

  onDestroy(() => {
    clearTimeout(debounceTimeout);
  });
</script>
<div class="address-search-dds flex w-full flex-col gap-[0.5rem]">
  <label
    class="label !m-0 block text-base leading-snug text-gray-900"
    for={inputId}
  >
    {appText.inputs.searchLabel}
  </label>
  <div class="dds-address-select">
    <input
      id={inputId}
      class="input w-full"
      type="text"
      autocomplete="off"
      role="combobox"
      aria-expanded={isDropdownOpen}
      aria-controls={listboxId}
      aria-activedescendant={highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
      aria-autocomplete="list"
      placeholder={appText.inputs.searchPlaceholder}
      value={inputValue}
      on:input={handleInput}
      on:focus={handleFocus}
      on:keydown={handleKeydown}
    />
    {#if isDropdownOpen && suggestions.length > 0}
      <ul id={listboxId} class="dds-dropdown" role="listbox">
        {#each suggestions as option, index (option.place_id || `${option.display_name}-${option.lon}-${option.lat}`)}
          <li
            id={getOptionId(index)}
            class="dds-option"
            class:is-highlighted={index === highlightedIndex}
            class:is-selected={selectedSearchResult && selectedSearchResult.display_name === option.display_name}
            role="option"
            aria-selected={index === highlightedIndex}
            on:mouseenter={() => handleOptionMouseEnter(index)}
            on:mousedown={() => handleOptionMouseDown(option)}
          >
            {option.display_name}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
<svelte:window on:mousedown={handleWindowClick} />

<style>
  .address-search-dds .dds-address-select {
    position: relative;
  }

  .address-search-dds .dds-dropdown {
    position: absolute;
    left: 0;
    right: 0;
    margin-top: 8px;
    max-height: 16rem;
    overflow-y: auto;
    z-index: 320;
    border: 1px solid #1e4557;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
  }

  .address-search-dds .dds-option {
    padding: 10px;
    color: #146c8b;
    cursor: pointer;
    list-style: none;
  }

  .address-search-dds .dds-option:hover,
  .address-search-dds .dds-option.is-highlighted {
    color: #1e4557;
    background: #f8f8f8;
  }

  .address-search-dds .dds-option.is-selected {
    font-weight: 700;
    color: #1e4557;
    background: #ebebeb;
  }
</style>
