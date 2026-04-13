<script>
  import IconSymbolBaselstab from "@kanton-basel-stadt/designsystem/icons/symbol/baselstab";
  import { kantonLogoHref } from "$lib/settings.js";

  /** @type {string} */
  export let href = kantonLogoHref;

  export let targetBlank = true;

  /** @type {string} */
  export let ariaLabel = "Logo - Kanton Basel-Stadt";

  /**
   * Sidebar: block-level full width. Matches StataBS `BSLogo` in bs-dashboard-base when false.
   * @see https://github.com/StataBS/bs-dashboard-base/blob/main/app/components/BSLogo.vue
   */
  export let compact = false;

  /** Single horizontal row with lang / links: shrink + truncate on narrow viewports. */
  export let headerRow = false;
</script>

<a
  {href}
  target={targetBlank ? "_blank" : undefined}
  rel={targetBlank ? "noopener noreferrer" : undefined}
  aria-label={ariaLabel}
  class="max-w-full min-w-0 hover:opacity-80 no-underline {compact && headerRow
    ? 'block min-w-0 max-w-full'
    : compact
      ? 'block w-full'
      : 'inline-block'}"
>
  <!-- Typography + baselstab: aligned with bs-dashboard-base BSLogo.vue -->
  <div
    class="flex min-w-0 max-w-full whitespace-nowrap leading-none relative {headerRow
      ? 'text-xl leading-[1.15] sm:text-base sm:leading-none lg:text-lg xl:text-2xl'
      : 'text-base lg:text-lg xl:text-2xl'}"
  >
    <IconSymbolBaselstab
      data-symbol="baselstab"
      aria-hidden="true"
      class="mt-[0.18em] shrink-0 text-[0.59em] w-[1em] h-[1.7em]"
    />
    <span
      class="h-[1.2083em] min-w-0 ml-[0.3em] pl-[0.25em] leading-[1.2em] border-l border-gray-900 font-bold {headerRow
        ? 'truncate'
        : ''}"
      title="Kanton Basel-Stadt"
    >
      <span class="sr-only">Herausgeber/Éditeur/Editore/Publisher:</span>
      Kanton Basel-Stadt
    </span>
  </div>
</a>
