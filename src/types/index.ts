import type { Browser } from "wxt/browser";

/** App-level tab type. id, url, and windowId are required (they're optional in the
 *  browser type) — we validate them upfront via isvalidtab() in @/utils/helper.ts. */
export type Tab = Browser.tabs.Tab & {
	id: number;
	url: string;
	windowId: number;
	isDuplicate: boolean;
	isAI: boolean;
};

/** Firefox provides previousTabId on onActivated; force it required here since
 *  this extension only supports firefox. */
export type OnActivatedInfoFirefox = Browser.tabs.OnActivatedInfo & {
	previousTabId: number;
};
