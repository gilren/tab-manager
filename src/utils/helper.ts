import type { Browser } from "wxt/browser";
import type { Tab } from "@/types";

export function isValidTab(t: Browser.tabs.Tab): t is Tab {
	return t.id !== undefined && t.url !== undefined && t.windowId !== undefined;
}
