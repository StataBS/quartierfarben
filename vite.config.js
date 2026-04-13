import path from "node:path";
import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";
import KantonBSDesignsystemPlugin from "@kanton-basel-stadt/designsystem/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const repoRoot = path.join(__dirname, "..");
  const env = {
    ...loadEnv(mode, repoRoot, ""),
    ...loadEnv(mode, __dirname, ""),
  };
  return {
    /** One copy of Vite/Kit/Svelte — mixed versions break `$app/*` SSR resolution. */
    resolve: {
      dedupe: ["svelte", "@sveltejs/kit"],
    },
    optimizeDeps: {
      /**
       * Keep SvelteKit defaults (merged by Vite) + exclude svelte-select so esbuild
       * does not try to load raw `.svelte` from node_modules.
       */
      exclude: ["svelte-select", "@sveltejs/kit", "$app", "$env"],
    },
    plugins: [
      sveltekit(),
      KantonBSDesignsystemPlugin({
        iconOptions: { compiler: "svelte" },
        tailwindOptions: {
          config: {
            content: ["./src/**/*.{html,js,svelte,ts,json}"],
          },
        },
      }),
    ],
    define: {
      "import.meta.env.PUBLIC_API_KEY_MAPBS": JSON.stringify(
        env.API_KEY_MAPBS ?? env.PUBLIC_API_KEY_MAPBS ?? "",
      ),
    },
    build: {
      chunkSizeWarningLimit: 1300,
    },
    server: {
      fs: {
        strict: false,
      },
    },
  };
});
