export default defineBackground(() => {
	browser.browserAction.onClicked.addListener(() => {
		openTabManager();
	});
});

async function openTabManager(): Promise<void> {
	const fullUrl = browser.runtime.getURL("/app.html");

	const tabs = await browser.tabs.query({ url: fullUrl });

	if (tabs.length > 0) {
		const tab = tabs[0];
		if (!isValidTab(tab)) return;
		await browser.tabs.update(tab.id, { active: true });
		await browser.windows.update(tab.windowId, { focused: true });
	} else {
		await browser.tabs.create({ url: fullUrl, active: true });
	}
}
