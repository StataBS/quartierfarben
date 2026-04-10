import path from "node:path";
import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
	const repoRoot = path.join(__dirname, "..");
	const env = {
		...loadEnv(mode, repoRoot, ""),
		...loadEnv(mode, __dirname, ""),
	};
	return {
		plugins: [sveltekit()],
		define: {
			"import.meta.env.PUBLIC_API_KEY_MAPBS": JSON.stringify(
				env.API_KEY_MAPBS ?? env.PUBLIC_API_KEY_MAPBS ?? ""
			),
		},
		build: {
			chunkSizeWarningLimit: 1300,
		},
	};
});
