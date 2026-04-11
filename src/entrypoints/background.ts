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
	const path = "/index.html";
	const fullUrl = browser.runtime.getURL(path);

	const tabs = await browser.tabs.query({ url: fullUrl });

	if (tabs.length > 0) {
		const tab = tabs[0];
		if (tab.id === undefined || tab.windowId === undefined) return;
		await browser.tabs.update(tab.id, { active: true });
		await browser.windows.update(tab.windowId, { focused: true });
	} else {
		await browser.tabs.create({ url: fullUrl, active: true });
	}
}
