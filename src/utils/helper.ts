import type { Browser } from "wxt/browser";
import type { Tab } from "@/types";

export function isValidTab(tab: Browser.tabs.Tab): tab is Tab {
	return (
		tab.id !== undefined && tab.url !== undefined && tab.windowId !== undefined
	);
}

/**
 * Returns whether a tab can be safely discarded.
 *
 * A discardable tab must be loaded, inactive, and not an internal `about:` page,
 * except for `about:new*` pages which Firefox allows discarding.
 */
export function isTabDiscardable(tab: Tab) {
	return (
		!tab.discarded &&
		!tab.active &&
		(!tab.url.startsWith("about:") || tab.url.startsWith("about:new"))
	);
}

const aiKeywords = ["chatgpt", "claude", "duck.ai", "gemini"];

export function isAiTab(url: string): boolean {
	const lower = url.toLowerCase();
	return aiKeywords.some((kw) => lower.includes(kw));
}

export function groupTabsByUrl(tabs: Tab[]): Map<string, number[]> {
	const map = new Map<string, number[]>();
	for (const tab of tabs) {
		const existing = map.get(tab.url);
		if (existing) {
			existing.push(tab.id);
		} else {
			map.set(tab.url, [tab.id]);
		}
	}
	return map;
}

export function normalizeSearch(search = ""): string {
	return search.toLowerCase().trim();
}

export function matchesSearch(tab: Tab, search = ""): boolean {
	const needle = normalizeSearch(search);
	if (!needle) return true;

	return (
		tab.title?.toLowerCase().includes(needle) ||
		tab.url.toLowerCase().includes(needle)
	);
}

export function extractTabIds(tabs: Tab[]): number[] {
	return tabs.map((tab) => tab.id);
}
