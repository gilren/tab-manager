export default defineBackground(() => {
	browser.browserAction.onClicked.addListener(() => {
		openTabManager();
	});

	browser.commands.onCommand.addListener((command) => {
		if (command === "open-tab-manager") {
			openTabManager();
		}
	});
});

async function openTabManager(): Promise<void> {
	const tabId = "/index.html";
	const fullUrl = browser.runtime.getURL(tabId);

	const tabs = await browser.tabs.query({ url: fullUrl });

	console.log(tabs);

	if (tabs.length > 0) {
		browser.tabs.update(tabs[0].id, { active: true }).then(() => {
			const windowId = tabs[0].windowId;
			if (!windowId) return;
			browser.windows.update(windowId, { focused: true });
		});
	} else {
		browser.tabs.create({ url: fullUrl, active: true });
	}
}
