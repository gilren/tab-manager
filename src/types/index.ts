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

/** Firefox provides previousTabId on onActivated, but the shared WebExtension
 *  typings don't guarantee it. Keep it optional so handlers remain assignable to
 *  the cross-browser listener signature. */
export type OnActivatedInfoFirefox = Browser.tabs.OnActivatedInfo & {
	previousTabId?: number;
};
