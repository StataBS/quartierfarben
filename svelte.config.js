import preprocess from "svelte-preprocess";
import adapter from "@sveltejs/adapter-static";

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
      base: process.env.BASE_PATH || ""
    },
    prerender: { entries: ['*'] } // static export of all routable pages
  },
  preprocess: [preprocess({ postcss: true })]
};

export default config;
