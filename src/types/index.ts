import type { Browser } from "wxt/browser";

type RawTab = Browser.tabs.Tab;

export type Tab = Omit<RawTab, "id" | "url" | "windowId"> & {
	id: number;
	url: string;
	windowId: number;
};
