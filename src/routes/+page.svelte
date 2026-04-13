<script>
  import Map from "$components/map/Map.svelte";
  import MapKey from "$components/map/MapKey.svelte";

  import PostcardFront from "$components/postcard/PostcardFront.svelte";
  import PostcardBack from "$components/postcard/PostcardBack.svelte";
  import PostcardTextInput from "$components/postcard/PostcardTextInput.svelte";
  import Search from "$components/search/Search.svelte";
  import PrintAndDownload from "$components/PrintAndDownload.svelte";
  import SiteFooter from "$components/SiteFooter.svelte";
  import SidebarBrandHeader from "$components/SidebarBrandHeader.svelte";

  import {
    projectTitle,
    documentTitle,
    og_siteName,
    url,
    sidebarWidthLgPx
  } from "$lib/settings.js"
  import {
    lang,
    isMobile,
    screenWidth,
    printBackUI,
  } from "$lib/stores.js";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  let innerWidth = 0;
  let innerHeight = 0;

  $: $isMobile = innerWidth <= 1023;
  $: $screenWidth = innerWidth;

  let appText = {};
  $: {
    if ($lang === 'en') {
      appText = en;
    } else {
      appText = de;
    }
  }

  /** Sticky brand strip: hide on scroll down, show on scroll up (bs-dashboard-base NavBar pattern). */
  let brandHeaderCollapsed = false;
  let lastScrollY = 0;
  /** After toggling collapse, layout/scrollTop jumps; ignore direction logic until this time (ms since perf epoch). */
  let settleUntil = 0;
  /** @type {number} */
  let scrollRaf = 0;

  /** @type {HTMLDivElement | undefined} */
  let sidebarScrollRoot;

  function getSidebarScrollY() {
    if (typeof window === "undefined") return 0;
    const isLg = window.matchMedia("(min-width: 1024px)").matches;
    if (isLg && sidebarScrollRoot) return sidebarScrollRoot.scrollTop;
    return (
      window.scrollY ||
      document.documentElement.scrollTop ||
      (typeof document !== "undefined" && document.body
        ? document.body.scrollTop
        : 0)
    );
  }

  function nowMs() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function applyBrandScrollLogic() {
    const t = nowMs();
    const y = getSidebarScrollY();

    if (t < settleUntil) {
      lastScrollY = y;
      return;
    }

    const delta = y - lastScrollY;
    const topThreshold = 4;
    const hideAfter = 28;
    /** Firmer than before: avoids noise; still responsive. */
    const minDeltaHide = 5;
    const minDeltaShow = 6;

    const prev = brandHeaderCollapsed;

    if (y <= topThreshold) {
      brandHeaderCollapsed = false;
    } else if (delta > minDeltaHide && y > hideAfter) {
      brandHeaderCollapsed = true;
    } else if (delta < -minDeltaShow) {
      brandHeaderCollapsed = false;
    }

    if (prev !== brandHeaderCollapsed) {
      settleUntil = t + 340;
    }

    lastScrollY = y;
  }

  function onSidebarOrWindowScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      applyBrandScrollLogic();
    });
  }

  /** @param {HTMLDivElement} node */
  function attachSidebarScroll(node) {
    sidebarScrollRoot = node;
    lastScrollY = getSidebarScrollY();
    settleUntil = 0;
    const fn = () => onSidebarOrWindowScroll();
    window.addEventListener("scroll", fn, { passive: true });
    node.addEventListener("scroll", fn, { passive: true });
    const onResize = () => {
      lastScrollY = getSidebarScrollY();
      settleUntil = nowMs() + 50;
      onSidebarOrWindowScroll();
    };
    window.addEventListener("resize", onResize, { passive: true });
    onSidebarOrWindowScroll();
    return {
      destroy() {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = 0;
        window.removeEventListener("scroll", fn);
        window.removeEventListener("resize", onResize);
        node.removeEventListener("scroll", fn);
        sidebarScrollRoot = undefined;
      }
    };
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<svelte:head>
  <title>{documentTitle}</title>
  <meta
    name="description"
    content={appText.meta.description}
  />
  <meta property="og:title" content="{documentTitle}" />
  <meta property="og:site_name" content="{og_siteName}" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=0.8, user-scalable=0"
  />
  <meta
    property="og:description"
    content={appText.meta.description}
  />
  <meta property="og:url" content={url} />

</svelte:head>

<section
  class="relative flex min-h-screen w-full flex-col lg:min-h-[100dvh]"
>
  <!-- Full-viewport map behind UI (lg+). In narrow layout the map stays in document flow. -->
  <div
    class="z-0 flex w-full flex-col max-lg:order-2 max-lg:relative max-lg:min-h-[min(36vh,280px)] sm:max-lg:min-h-[min(55vh,480px)] lg:order-none lg:fixed lg:inset-0 lg:h-[100dvh] lg:min-h-0"
  >
    <Map />
  </div>

  <!-- Kanton DDS maps numeric spacing to px (e.g. gap-8 → 8px). Use […rem] for layout rhythm. -->
  <div
    use:attachSidebarScroll
    class="sidebar-panel box-border z-10 flex w-full min-w-0 shrink-0 flex-col gap-8 bg-white px-0 pt-0 pb-3 sm:gap-10 sm:pb-4 max-lg:order-1 max-lg:overflow-x-visible max-lg:overflow-y-visible lg:order-none lg:fixed lg:left-0 lg:top-0 lg:z-[30] lg:h-screen lg:w-[var(--sidebar-lg-w)] lg:min-w-[var(--sidebar-lg-w)] lg:max-w-[var(--sidebar-lg-w)] lg:gap-12 lg:overflow-x-hidden lg:overflow-y-auto lg:pb-5"
    style="--sidebar-lg-w: {sidebarWidthLgPx}px;"
    class:shadow-lg={!$isMobile}
  >
    <SidebarBrandHeader
      languageAriaLabel={appText.header.language}
      collapsed={brandHeaderCollapsed}
    />

    <div
      class="sidebar-panel-body flex min-w-0 flex-col gap-[1.5rem] px-[1.5rem] pb-0 pt-6 sm:px-[2rem] sm:pt-8 lg:pt-10"
    >
      <div
        class="sidebar-panel-title flex min-w-0 flex-row flex-wrap items-start justify-between gap-[0.75rem] pt-2 sm:pt-3"
      >
        <div
          class="min-w-0 max-w-full flex-1 break-words text-4xl font-bold leading-tight text-[rgb(50,131,74)] md:text-4xl xl:text-5xl lg:break-normal lg:whitespace-nowrap"
        >
          {projectTitle}
        </div>
      </div>

      <p class="m-0 lg:text-[18px]">
        {@html appText.description}
      </p>

      <div class="flex w-full shrink-0 flex-col gap-0">
        <div class="w-full shrink-0"><Search /></div>
      </div>

      <div class="hidden w-full min-w-0 lg:block">
        <PostcardTextInput />
      </div>

      <div class="hidden w-full min-w-0 flex-col gap-y-20 lg:gap-y-24 lg:flex">
        <PrintAndDownload />
        <SiteFooter />
      </div>
    </div>
    </div>

  {#if !$isMobile}
    <div class="pointer-events-none fixed inset-0 z-[25] max-lg:hidden lg:order-none">
      <PostcardFront />
    </div>
  {/if}

  {#if $isMobile}
    <div
      class="relative z-10 w-full max-lg:order-3 bg-gray-100 px-[1.5rem] sm:px-[2rem]"
    >
      <MapKey />
    </div>
  {/if}
  {#if $isMobile}
    <div class="max-lg:order-4">
      <PostcardFront />
    </div>
  {/if}
  {#if $isMobile}
    <div class="max-lg:order-5 bg-white px-[1.5rem] py-2 sm:px-[2rem]">
      <PostcardTextInput />
    </div>
  {/if}
  <div
    class="z-10 flex w-full max-lg:order-6 flex-col gap-y-20 overflow-auto bg-white px-[1.5rem] py-3 sm:px-[2rem] sm:py-4 lg:hidden"
  >
    <PrintAndDownload />
    <SiteFooter />
  </div>
</section>

{#if $printBackUI}
  <span class="p-4 hidden">
    <PostcardBack />
  </span>
{/if}
