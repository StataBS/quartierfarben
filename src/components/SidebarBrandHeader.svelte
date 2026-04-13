<script>
  import KantonBsLogo from "$components/KantonBsLogo.svelte";
  import SidebarLangDropdown from "$components/SidebarLangDropdown.svelte";

  /** @type {string} */
  export let languageAriaLabel = "Sprache";

  /** Slide up out of view (parent sets from scroll; bs-dashboard-base NavBar pattern). */
  export let collapsed = false;
</script>

<!--
  Outer clips when translating. Inner matches sticky-navbar + sticky-navbar--hidden from bs-dashboard-base.
  https://github.com/StataBS/bs-dashboard-base/blob/main/app/assets/css/components/navbar.css
-->
<div
  class="sidebar-brand-shell sticky top-0 z-40 box-border w-full min-w-0 shrink-0 border-b bg-white transition-[max-height] duration-300 ease-in-out print:!max-h-none print:overflow-visible
    {collapsed
    ? 'max-h-0 overflow-hidden pointer-events-none border-transparent'
    : 'max-h-[51px] overflow-visible border-gray-400 lg:max-h-[71px]'}"
  aria-hidden={collapsed}
>
  <!-- No transform when open: transform + overflow create a containing block and clip `position:fixed` menus. -->
  <div
    class="sidebar-brand-bar-inner bg-white transition-transform duration-300 ease-in-out print:!translate-y-0
      {collapsed ? '-translate-y-full overflow-hidden' : ''}"
  >
    <div
      class="flex h-[50px] min-h-[50px] w-full min-w-0 flex-row flex-nowrap items-center justify-start gap-2 px-[1.5rem] sm:gap-3 sm:px-[2rem] lg:h-[70px] lg:min-h-[70px] print:h-auto print:min-h-0"
    >
      <div class="min-w-0 flex-1 basis-0 self-center">
        <KantonBsLogo compact headerRow />
      </div>
      <div class="self-center">
        <SidebarLangDropdown ariaLabel={languageAriaLabel} />
      </div>
    </div>
  </div>
</div>
