import type { Tab, TabState } from "@/types";

const state: TabState = {
	allTabs: [],
	filter: "",
	focusedTabId: null,
	collapsedWindows: new Set(),
};

async function loadTabs(): Promise<void> {
	const raw = await browser.tabs.query({});
	state.allTabs = raw.filter(
		(t): t is Tab =>
			t.id !== undefined && t.url !== undefined && t.windowId !== undefined,
	);
}

function subscribe(callback: () => void): () => void {
	const handler = () => {
		loadTabs().then(callback).catch(console.error);
	};

	browser.tabs.onCreated.addListener(handler);
	browser.tabs.onRemoved.addListener(handler);
	browser.tabs.onUpdated.addListener(handler);

	return () => {
		browser.tabs.onCreated.removeListener(handler);
		browser.tabs.onRemoved.removeListener(handler);
		browser.tabs.onUpdated.removeListener(handler);
	};
}

export const tabState = {
	get allTabs() {
		return state.allTabs;
	},

	get filter() {
		return state.filter;
	},

	get focusedTabId() {
		return state.focusedTabId;
	},

	get collapsedWindows() {
		return state.collapsedWindows;
	},

	setFilter(filter: string) {
		state.filter = filter;
	},

	setFocusedTabId(id: number | null) {
		state.focusedTabId = id;
	},

	toggleCollapsedWindow(windowId: number) {
		if (state.collapsedWindows.has(windowId)) {
			state.collapsedWindows.delete(windowId);
		} else {
			state.collapsedWindows.add(windowId);
		}
	},

	loadTabs,
	subscribe,
};
