import type { Browser } from "wxt/browser";
import type { Tab } from "@/types";

export function isValidTab(tab: Browser.tabs.Tab): tab is Tab {
	return (
		tab.id !== undefined && tab.url !== undefined && tab.windowId !== undefined
	);
}
