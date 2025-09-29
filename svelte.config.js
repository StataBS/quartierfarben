import preprocess from "svelte-preprocess";
import adapter from "@sveltejs/adapter-static";

const dev = process.env.NODE_ENV === "development";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
    }),
    alias: {
      $components: "src/components",
      $locales: "src/locales",
      $assets: "src/assets"
    },
    paths: {
      base: dev ? "" : "/quartierfarben"
    },
    prerender: { entries: ['*'] } // static export of all routable pages
  },
  preprocess: [preprocess({ postcss: true })]
};

export default config;
