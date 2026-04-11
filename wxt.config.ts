import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	browser: "firefox",
	modules: ["@wxt-dev/auto-icons"],
	autoIcons: { developmentIndicator: false },
	manifest: {
		browser_action: {},
		web_accessible_resources: [
			{
				resources: ["icons/*.svg", "icons/*.png"],
				matches: ["<all_urls>"],
			},
		],
	},
});
