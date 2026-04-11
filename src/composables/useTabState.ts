import type { Tab, TabState } from "@/types";

const state: TabState = {
	allTabs: [],
	filter: "",
	focusedTabId: null,
	collapsedWindows: new Set(),
};

export function useTabState() {
	async function loadTabs(): Promise<void> {
		const tabs = await browser.tabs.query({});
		state.allTabs = tabs as Tab[];
	}

	function subscribe(callback: () => void): () => void {
		const onCreated = () => {
			loadTabs().then(callback);
		};
		const onRemoved = () => {
			loadTabs().then(callback);
		};
		const onUpdated = () => {
			loadTabs().then(callback);
		};

		browser.tabs.onCreated.addListener(onCreated);
		browser.tabs.onRemoved.addListener(onRemoved);
		browser.tabs.onUpdated.addListener(onUpdated);

		return () => {
			browser.tabs.onCreated.removeListener(onCreated);
			browser.tabs.onRemoved.removeListener(onRemoved);
			browser.tabs.onUpdated.removeListener(onUpdated);
		};
	}

	return {
		get state() {
			return state;
		},

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
}
