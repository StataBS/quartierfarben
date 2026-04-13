<script>
  import { lang } from "$lib/stores.js";
  import {
    footerLinks,
    feedbackEmail,
    feedbackSubjectPrefix
  } from "$lib/settings.js";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  let appText = {};
  $: appText = $lang === "en" ? en : de;

  $: feedbackMailHref = `mailto:${feedbackEmail}?subject=${encodeURIComponent(
    feedbackSubjectPrefix
  )}`;

  $: year = new Date().getFullYear();

  /** @type {'impressum' | 'barriere' | null} */
  let openPanel = null;

  function toggleImpressum() {
    openPanel = openPanel === "impressum" ? null : "impressum";
  }

  function toggleBarriere() {
    openPanel = openPanel === "barriere" ? null : "barriere";
  }

  /** Same classes the external meta links had before (weight comes from `<ul class="… font-medium">`). */
  const metaLinkClass =
    "link text-sm underline decoration-white underline-offset-4 hover:decoration-blue-700";

  const metaToggleBase =
    "link text-sm underline underline-offset-4 hover:decoration-blue-700 cursor-pointer border-0 bg-transparent p-0 text-left text-inherit";
</script>

<!-- Full-bleed within padded sidebar / mobile column; inner content keeps horizontal padding -->
<div
  class="-mx-[1.5rem] box-border w-[calc(100%+3rem)] max-w-none shrink-0 sm:-mx-[2rem] sm:w-[calc(100%+4rem)]"
>
  <hr class="h-[4px] w-full border-none bg-green-600" />

  <footer class="box-border w-full bg-gray-200 py-28 print:hidden lg:py-40">
  <h2 class="sr-only">{appText.siteFooter.srTitle}</h2>
  <div
    class="mx-auto flex w-full max-w-full flex-col gap-y-20 px-[1.5rem] sm:px-[2rem] lg:gap-y-24"
  >
    <nav aria-label={appText.siteFooter.ariaQuick} class="flex w-full flex-col gap-y-20">
      <a
        href={feedbackMailHref}
        class="button group/feedback w-full max-w-none"
      >
        <svg
          class="h-5 w-5 shrink-0 origin-center group-hover/feedback:animate-[ds-icon-pop_0.45s_ease]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.75"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {appText.siteFooter.feedback}
      </a>

      <ul class="flex flex-wrap gap-5 font-medium">
        <li>
          <a
            class="button is-sm is-link"
            href={footerLinks.aboutUs}
            target="_blank"
            rel="noopener noreferrer"
          >
            {appText.siteFooter.aboutUs}
          </a>
        </li>
        <li>
          <a
            class="button is-sm is-link"
            href={footerLinks.geoinformation}
            target="_blank"
            rel="noopener noreferrer"
          >
            {appText.siteFooter.geoinformation}
          </a>
        </li>
        <li>
          <a
            class="button is-sm is-link"
            href={footerLinks.kiezcolors}
            target="_blank"
            rel="noopener noreferrer"
          >
            {appText.siteFooter.kiezcolors}
          </a>
        </li>
        <li>
          <a
            class="button is-sm is-link"
            href={footerLinks.graetzlfarben}
            target="_blank"
            rel="noopener noreferrer"
          >
            {appText.siteFooter.graetzlfarben}
          </a>
        </li>
        <li>
          <a
            class="group/github button is-sm inline-flex items-center gap-2"
            href={footerLinks.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              class="h-4 w-4 shrink-0 origin-center group-hover/github:animate-[ds-icon-pop_0.45s_ease]"
              viewBox="0 0 98 96"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.653c4.125 0 8.33.571 12.213 1.653 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.142-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.934 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              />
            </svg>
            {appText.siteFooter.github}
          </a>
        </li>
      </ul>
    </nav>

    <nav aria-label={appText.siteFooter.ariaSocial}>
      <ul class="flex flex-wrap gap-5 font-medium">
        <li>
          <a
            class="button is-sm is-icon-only"
            href={footerLinks.socialInstagram}
            aria-label="Instagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-3.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z"
              />
            </svg>
            <span class="sr-only">
              Instagram
              <span class="sr-only">{appText.siteFooter.externalNewTab}</span>
            </span>
          </a>
        </li>
        <li>
          <a
            class="button is-sm is-icon-only overflow-visible"
            href={footerLinks.socialLinkedin}
            aria-label="LinkedIn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              class="h-5 w-5 shrink-0 overflow-visible"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.78v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.69 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"
              />
            </svg>
            <span class="sr-only">
              LinkedIn
              <span class="sr-only">{appText.siteFooter.externalNewTab}</span>
            </span>
          </a>
        </li>
        <li>
          <a
            class="button is-sm is-icon-only overflow-visible"
            href={footerLinks.socialYoutube}
            aria-label="YouTube"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              class="h-5 w-5 shrink-0 overflow-visible"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
              />
            </svg>
            <span class="sr-only">
              YouTube
              <span class="sr-only">{appText.siteFooter.externalNewTab}</span>
            </span>
          </a>
        </li>
      </ul>
    </nav>

    <div class="flex flex-col gap-6">
      <nav aria-label={appText.siteFooter.ariaMeta}>
        <ul class="flex flex-wrap gap-x-8 gap-y-3 font-medium">
          <li>
            <a
              class={metaLinkClass}
              href={footerLinks.startseite}
              target="_blank"
              rel="noopener noreferrer"
            >
              {appText.siteFooter.startseite}
            </a>
          </li>
          <li>
            <a
              class={metaLinkClass}
              href={footerLinks.datenschutz}
              target="_blank"
              rel="noopener noreferrer"
            >
              {appText.siteFooter.datenschutz}
            </a>
          </li>
          <li>
            <a
              class={metaLinkClass}
              href={footerLinks.ombudsstelle}
              target="_blank"
              rel="noopener noreferrer"
            >
              {appText.siteFooter.ombudsstelle}
            </a>
          </li>
          <li>
            <button
              type="button"
              class="{metaToggleBase} {openPanel === 'impressum'
                ? 'decoration-blue-700'
                : 'decoration-white'}"
              aria-expanded={openPanel === "impressum"}
              aria-controls="footer-legal-panel"
              on:click={toggleImpressum}
            >
              {appText.siteFooter.impressumHeading}
            </button>
          </li>
          <li>
            <button
              type="button"
              class="{metaToggleBase} {openPanel === 'barriere'
                ? 'decoration-blue-700'
                : 'decoration-white'}"
              aria-expanded={openPanel === "barriere"}
              aria-controls="footer-legal-panel"
              on:click={toggleBarriere}
            >
              {appText.siteFooter.barrierefreiheitHeading}
            </button>
          </li>
        </ul>
      </nav>

      {#if openPanel}
        <div
          id="footer-legal-panel"
          role="region"
          aria-label={openPanel === "impressum"
            ? appText.siteFooter.impressumHeading
            : appText.siteFooter.barrierefreiheitHeading}
        >
          {#if openPanel === "impressum"}
            <div class="text-sm text-gray-800">
              <p class="m-0 font-bold text-blue-900">
                {appText.siteFooter.impressumHeading}
              </p>
              <div class="mt-2 [&_a]:underline">
                {@html appText.footer.impressumHtml}
              </div>
            </div>
          {:else}
            <div class="text-sm text-gray-800">
              <p class="m-0 font-bold text-blue-900">
                {appText.siteFooter.barrierefreiheitHeading}
              </p>
              <p class="m-0 mt-2">
                {appText.footer.accessibilityStatement}
              </p>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="text-sm font-bold text-blue-900">
      {appText.siteFooter.copyright.replace("{year}", String(year))}
    </div>
  </div>
  </footer>
</div>
