import type { Tab, TabService } from "@/types";

export function useTabService(loadTabs: () => Promise<void>): TabService {
	function findDuplicates(tabs: Tab[]): Set<string> {
		const seen = new Set<string>();
		const duplicates = new Set<string>();
		for (const tab of tabs) {
			if (!tab.url) continue;
			if (seen.has(tab.url)) {
				duplicates.add(tab.url);
			} else {
				seen.add(tab.url);
			}
		}
		return duplicates;
	}

	async function removeDuplicates(tabs: Tab[]): Promise<void> {
		const duplicates = findDuplicates(tabs);
		const seen = new Set<string>();
		const toRemove: number[] = [];
		for (const tab of tabs) {
			if (!tab.url || !duplicates.has(tab.url)) continue;
			if (seen.has(tab.url)) {
				toRemove.push(tab.id);
			} else {
				seen.add(tab.url);
			}
		}
		for (const id of toRemove) {
			await browser.tabs.remove(id);
		}
	}

	async function activateTab(tabId: number, windowId: number): Promise<void> {
		await browser.tabs.update(tabId, { active: true });
		await browser.windows.update(windowId, { focused: true });
	}

	async function closeTab(tabId: number): Promise<void> {
		await browser.tabs.remove(tabId);
		await loadTabs();
	}

	return {
		loadTabs,
		findDuplicates,
		removeDuplicates,
		activateTab,
		closeTab,
	};
}
