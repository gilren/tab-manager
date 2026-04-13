import type { Browser } from "wxt/browser";

export type Tab = Browser.tabs.Tab & {
	id: number;
	url: string;
	windowId: number;
	isDuplicate: boolean;
};
