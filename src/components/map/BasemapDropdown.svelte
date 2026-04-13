<script>
  import { onMount, tick } from "svelte";
  import { basemapId } from "$lib/stores.js";
  import { BASEMAP_IDS } from "$lib/basemapTiles.js";
  import { portalToBody } from "$lib/portalToBody.js";

  /** @type {string} */
  export let ariaLabel = "Hintergrundkarten";

  /** @type {Record<string, string>} labels keyed by basemap id */
  export let optionLabels = {};

  let open = false;
  /** @type {HTMLDivElement | undefined} */
  let rootEl;
  /** @type {HTMLButtonElement | undefined} */
  let triggerEl;

  let menuTop = 0;
  let menuLeft = 0;
  let menuWidth = 280;
  /** @type {HTMLUListElement | undefined} */
  let menuUl;

  $: selectedLabel =
    optionLabels[$basemapId] ?? $basemapId;

  function close() {
    open = false;
  }

  /** @param {string} value */
  function pick(value) {
    $basemapId = value;
    close();
  }

  /** @param {KeyboardEvent} e */
  function onGlobalKeydown(e) {
    if (e.key === "Escape") close();
  }

  async function positionMenu() {
    await tick();
    if (typeof window === "undefined" || !triggerEl || !open) return;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
    if (!triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    const pad = 6;
    const w = Math.max(r.width, 280);
    menuWidth = w;
    const openUp =
      window.matchMedia("(min-width: 1024px)").matches;
    let top;
    if (openUp && menuUl) {
      const h = menuUl.offsetHeight || 320;
      top = r.top - h - pad;
      if (top < 8) {
        top = r.bottom + pad;
      }
    } else {
      top = r.bottom + pad;
    }
    menuTop = top;
    let left = r.right - w;
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - w - 8);
    }
    menuLeft = left;
  }

  $: if (open && menuUl) {
    tick().then(() => requestAnimationFrame(() => positionMenu()));
  }

  onMount(() => {
    function onDocClick(/** @type {MouseEvent} */ e) {
      if (!rootEl || !(e.target instanceof Node)) return;
      if (rootEl.contains(e.target)) return;
      if (menuUl && menuUl.contains(e.target)) return;
      close();
    }
    function onReposition() {
      if (open) positionMenu();
    }
    document.addEventListener("click", onDocClick);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  });
</script>

<svelte:window on:keydown={onGlobalKeydown} />

<div class="relative z-30 shrink-0" bind:this={rootEl}>
  <button
    bind:this={triggerEl}
    type="button"
    class="basemap-trigger group/basemap button is-sm max-w-none shrink-0 whitespace-nowrap"
    data-open={open ? "true" : undefined}
    aria-expanded={open}
    aria-haspopup="listbox"
    aria-label={ariaLabel}
    on:click|stopPropagation={() => (open = !open)}
  >
    <svg
      class="basemap-layers-icon origin-center shrink-0 group-hover/basemap:animate-[ds-icon-pop_0.45s_ease]"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path
        d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
      />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
    <span class="max-w-[min(14rem,55vw)] truncate text-left">{selectedLabel}</span>
    <svg
      class="lang-chevron shrink-0 transition-transform duration-150"
      class:lang-chevron--open={open}
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clip-rule="evenodd"
      />
    </svg>
  </button>

  {#if open}
    <ul
      bind:this={menuUl}
      use:portalToBody
      class="basemap-menu fixed z-[1200] max-h-[min(70vh,28rem)] list-none space-y-5 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.1),0_2px_8px_rgba(15,23,42,0.06)] sm:space-y-6 sm:p-7"
      style="top: {menuTop}px; left: {menuLeft}px; width: {menuWidth}px;"
      role="listbox"
      aria-label={ariaLabel}
    >
      {#each BASEMAP_IDS as id (id)}
        <li role="option" aria-selected={$basemapId === id}>
          <button
            type="button"
            class="basemap-menu__option w-full rounded-md px-5 py-5 text-left text-base transition-colors duration-150 hover:bg-purple-50 hover:!text-purple-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 {$basemapId === id
              ? 'font-bold text-blue-900'
              : 'font-normal text-gray-600'}"
            on:click={() => pick(id)}
          >
            {optionLabels[id] ?? id}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .basemap-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    max-width: min(100%, 20rem);
  }

  :global(button.basemap-trigger.button.is-sm[data-open="true"]) {
    --button-bg: theme("colors.purple.100");
    --button-border: theme("colors.purple.600");
    --button-text: theme("colors.purple.900");
  }

  :global(button.basemap-trigger.button.is-sm[data-open="true"]:hover),
  :global(button.basemap-trigger.button.is-sm[data-open="true"]:focus-visible) {
    --button-text: theme("colors.purple.900");
  }

  :global(button.basemap-trigger.button.is-sm) .lang-chevron {
    display: block;
    width: 16px;
    height: 16px;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    color: inherit;
    opacity: 1;
  }

  .lang-chevron--open {
    transform: rotate(180deg);
  }

  :global(button.basemap-trigger.button.is-sm) .basemap-layers-icon {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  .basemap-layers-icon {
    flex-shrink: 0;
  }
</style>
