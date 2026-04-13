<script>
  import { onMount, tick } from "svelte";
  import { lang } from "$lib/stores.js";

  /** @type {string} */
  export let ariaLabel = "Sprache";

  let open = false;
  /** @type {HTMLDivElement | undefined} */
  let rootEl;
  /** @type {HTMLButtonElement | undefined} */
  let triggerEl;

  let menuTop = 0;
  let menuLeft = 0;
  let menuWidth = 176;

  $: code = $lang === "de" ? "DE" : "EN";

  function close() {
    open = false;
  }

  /** @param {'de' | 'en'} value */
  function pick(value) {
    $lang = value;
    close();
  }

  /** @param {KeyboardEvent} e */
  function onGlobalKeydown(e) {
    if (e.key === "Escape") close();
  }

  async function positionMenu() {
    await tick();
    if (!open || !triggerEl || typeof window === "undefined") return;
    const r = triggerEl.getBoundingClientRect();
    const pad = 6;
    /* Wide enough for padded labels (px-5 + panel p-6) when trigger is narrow */
    const w = Math.max(r.width, 220);
    menuWidth = w;
    menuTop = r.bottom + pad;
    /* Right-align panel with trigger (bs.ch); same width as trigger at minimum */
    let left = r.right - w;
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - w - 8);
    }
    menuLeft = left;
  }

  $: if (open) {
    positionMenu();
  }

  onMount(() => {
    function onDocClick(/** @type {MouseEvent} */ e) {
      if (!rootEl || !(e.target instanceof Node)) return;
      if (!rootEl.contains(e.target)) close();
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
  <!-- Same surface + hover/focus as `button is-sm` (e.g. Über uns); chevron replaces is-link pseudo-icons -->
  <button
    bind:this={triggerEl}
    type="button"
    class="button is-sm max-w-none shrink-0 whitespace-nowrap"
    data-open={open ? "true" : undefined}
    aria-expanded={open}
    aria-haspopup="listbox"
    aria-label={ariaLabel}
    on:click|stopPropagation={() => (open = !open)}
  >
    <span>{code}</span>
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
      class="lang-menu fixed z-[200] list-none space-y-5 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.1),0_2px_8px_rgba(15,23,42,0.06)] sm:space-y-6 sm:p-7"
      style="top: {menuTop}px; left: {menuLeft}px; width: {menuWidth}px;"
      role="listbox"
      aria-label={ariaLabel}
    >
      <li role="option" aria-selected={$lang === "de"}>
        <button
          type="button"
          class="lang-menu__option w-full rounded-md px-5 py-5 text-left text-base transition-colors duration-150 hover:bg-purple-50 hover:!text-purple-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 {$lang === 'de'
            ? 'font-bold text-blue-900'
            : 'font-normal text-gray-600'}"
          on:click={() => pick("de")}
        >
          Deutsch
        </button>
      </li>
      <li role="option" aria-selected={$lang === "en"}>
        <button
          type="button"
          class="lang-menu__option w-full rounded-md px-5 py-5 text-left text-base transition-colors duration-150 hover:bg-purple-50 hover:!text-purple-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 {$lang === 'en'
            ? 'font-bold text-blue-900'
            : 'font-normal text-gray-600'}"
          on:click={() => pick("en")}
        >
          English
        </button>
      </li>
    </ul>
  {/if}
</div>

<style>
  /*
   * Open menu: lavender fill like bs.ch — mirrors :focus-visible / :active palette
   * from .button (purple), without extra font-weight (same as Über uns when “active”).
   */
  :global(button.button.is-sm[data-open="true"]) {
    --button-bg: theme("colors.purple.100");
    --button-border: theme("colors.purple.600");
    --button-text: theme("colors.purple.900");
  }

  :global(button.button.is-sm[data-open="true"]:hover),
  :global(button.button.is-sm[data-open="true"]:focus-visible) {
    --button-text: theme("colors.purple.900");
  }

  /* DS sets -my-5 on nested svg; reset so chevron stays visible and aligned with label */
  :global(button.button.is-sm) .lang-chevron {
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
</style>
