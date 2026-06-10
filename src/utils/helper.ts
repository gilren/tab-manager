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
