import type { Browser } from "wxt/browser";

type RawTab = Browser.tabs.Tab;

export type Tab = Omit<RawTab, "id" | "url" | "windowId"> & {
	id: number;
	url: string;
	windowId: number;
};

export interface TabsViewConfig {
	tabs: Tab[];
	duplicates: Set<string>;
	collapsedWindows: Set<number>;
	focusedTabId: number | null;
	onToggleCollapse: (windowId: number) => void;
	onActivateTab: (tabId: number, windowId: number) => void;
	onCloseTab: (tabId: number) => void;
}

export interface TabItemOptions {
	tab: Tab;
	windowId: number;
	isDuplicate: boolean;
	isFocused: boolean;
	onActivate: (tabId: number, windowId: number) => void;
	onClose: (tabId: number) => void;
}

export interface TabService {
	loadTabs(): Promise<void>;
	findDuplicates(tabs: Tab[]): Set<string>;
	removeDuplicates(tabs: Tab[]): Promise<void>;
	activateTab(tabId: number, windowId: number): Promise<void>;
	closeTab(tabId: number): Promise<void>;
}

export interface TabState {
	allTabs: Tab[];
	filter: string;
	focusedTabId: number | null;
	collapsedWindows: Set<number>;
}

export type Message =
	| { type: "getTabs" }
	| { type: "activateTab"; tabId: number; windowId: number }
	| { type: "closeTab"; tabId: number };
