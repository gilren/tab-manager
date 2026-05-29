import devtools from "solid-devtools/vite";
import solid from "vite-plugin-solid";

import { defineConfig } from "wxt";

export default defineConfig({
	vite: () => ({
		plugins: [
			devtools({
				autoname: true,
				locator: {
					targetIDE: "vscode",
					componentLocation: true,
					jsxLocation: true,
				},
			}),
			solid(),
		],
	}),
	srcDir: "src",
	browser: "firefox",
	modules: ["@wxt-dev/auto-icons", "@wxt-dev/module-solid"],
	// autoIcons: { developmentIndicator: false },
	manifest: {
		browser_action: {},
		browser_specific_settings: {
			gecko: {
				id: "tab-manager@gilren",
				strict_min_version: "109.0",
			},
		},
		permissions: ["tabs"],
		web_accessible_resources: [
			{
				resources: ["icons/*.svg", "icons/*.png"],
				matches: ["<all_urls>"],
			},
		],
	},
});
