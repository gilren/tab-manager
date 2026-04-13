import type { Accessor, ParentProps } from "solid-js";
import type { SetStoreFunction, Store } from "solid-js/store";
import type { Browser } from "wxt/browser";
import type { Tab } from "@/types";
import { isValidTab } from "@/utils/helper";

interface TabsStore {
	tabs: Store<Record<number, Tab>>;
	setTabs: SetStoreFunction<Record<number, Tab>>;

	pendingMoves: Set<number>;
	tabCount: Accessor<number>;
	windowOrder: Store<number[]>;
}

const TabsContext = createContext<TabsStore>();

export function useTabsContext(): TabsStore {
	const context = useContext(TabsContext);

	if (context === undefined) {
		throw new Error("CounterContext is missing");
	}
	return context;
}

function buildUrlToTabIds(tabs: Tab[]): Map<string, number[]> {
	const map = new Map<string, number[]>();
	for (const tab of tabs) {
		const existing = map.get(tab.url);
		if (existing) {
			existing.push(tab.id);
		} else {
			map.set(tab.url, [tab.id]);
		}
	}
	return map;
}

export function TabsProvider(props: ParentProps) {
	const [tabs, setTabs] = createStore<Record<number, Tab>>({});
	const [windowOrder, setWindowOrder] = createStore<number[]>([]);
	const pendingMoves = new Set<number>();

	onMount(() => {
		(async () => {
			const raw = await browser.tabs.query({});

			const windowIds = raw
				.map((t) => t.windowId)
				.filter((v, i, a) => a.indexOf(v) === i);
			setWindowOrder(windowIds);

			const valid = raw.filter(isValidTab);

			// Build tabs first (need full Tab objects for urlToTabIds)
			const tabsWithFlags: Record<number, Tab> = {};
			for (const bt of valid) {
				tabsWithFlags[bt.id] = bt;
			}

			// Build url -> tab IDs map
			const urlToTabIds = buildUrlToTabIds(Object.values(tabsWithFlags));

			// Update isDuplicate flags based on URL counts
			for (const tab of Object.values(tabsWithFlags)) {
				const ids = urlToTabIds.get(tab.url);
				if (ids && ids.length > 1) {
					// Find oldest (lowest ID)
					const oldestId = Math.min(...ids);
					tab.isDuplicate = tab.id !== oldestId;
				}
			}

			setTabs(reconcile(tabsWithFlags));
		})();

		const onCreated = (tab: Browser.tabs.Tab) => {
			if (!isValidTab(tab)) return;
			if (!windowOrder.includes(tab.windowId)) {
				setWindowOrder((ids) => [...ids, tab.windowId]);
			}
			if (pendingMoves.has(tab.id)) return;

			const existing = Object.values(tabs).find((t) => t.url === tab.url);
			tab.isDuplicate = !!existing;

			setTabs(tab.id, tab);
		};

		const onRemoved = (tabId: number) => {
			const removedTab = tabs[tabId];
			if (!removedTab) return;

			const { windowId, index: removedIndex } = removedTab;

			const sameUrlTabs = Object.values(tabs).filter(
				(t) => t.url === removedTab.url && t.id !== tabId,
			);
			const wasOldest =
				sameUrlTabs.length === 0 || sameUrlTabs.every((t) => t.id > tabId);

			setTabs(
				produce((s) => {
					delete s[tabId];

					// shift indexes down for tabs after the removed one in same window
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId === windowId && tab.index > removedIndex) {
							tab.index--;
						}
					}

					// promote next oldest duplicate if needed
					if (wasOldest && sameUrlTabs.length > 0) {
						const nextOldest = sameUrlTabs.reduce((a, b) =>
							a.id < b.id ? a : b,
						);
						s[nextOldest.id].isDuplicate = false;
					}
				}),
			);
		};

		const onUpdated = (
			_: number,
			__: Browser.tabs.OnUpdatedInfo,
			tab: Browser.tabs.Tab,
		) => {
			if (!isValidTab(tab)) return;
			setTabs(tab.id, (t) => ({ ...t, ...tab }));
		};

		const onActivated = ({ tabId, windowId }: Browser.tabs.OnActivatedInfo) => {
			setTabs(
				produce((s) => {
					for (const id in s) {
						if (s[id].windowId === windowId) {
							s[id].active = s[id].id === tabId;
						}
					}
				}),
			);
		};

		const onMoved = (tabId: number, info: Browser.tabs.OnMovedInfo) => {
			if (pendingMoves.has(tabId)) return;

			const { windowId, fromIndex, toIndex } = info;

			setTabs(
				produce((s) => {
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId !== windowId) continue;

						if (Number(id) === tabId) {
							tab.index = toIndex;
							continue;
						}

						// shift tabs between fromIndex and toIndex
						if (fromIndex < toIndex) {
							// moved down — tabs in between shift up
							if (tab.index > fromIndex && tab.index <= toIndex) tab.index--;
						} else {
							// moved up — tabs in between shift down
							if (tab.index >= toIndex && tab.index < fromIndex) tab.index++;
						}
					}
				}),
			);
		};

		const onDetached = (tabId: number, info: Browser.tabs.OnDetachedInfo) => {
			if (pendingMoves.has(tabId)) return;
			const { oldWindowId, oldPosition } = info;

			setTabs(
				produce((s) => {
					// shift tabs after the gap down by 1
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId !== oldWindowId) continue;
						if (Number(id) === tabId) continue;
						if (tab.index > oldPosition) tab.index--;
					}
				}),
			);
		};

		const onAttached = (tabId: number, info: Browser.tabs.OnAttachedInfo) => {
			if (pendingMoves.has(tabId)) return;
			const { newWindowId, newPosition } = info;

			setTabs(
				produce((s) => {
					// make room in new window
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId !== newWindowId) continue;
						if (Number(id) === tabId) continue;
						if (tab.index >= newPosition) tab.index++;
					}

					// update the tab itself
					s[tabId].index = newPosition;
					s[tabId].windowId = newWindowId;
				}),
			);
		};

		const onWindowRemoved = (windowId: number) => {
			setWindowOrder((ids) => ids.filter((id) => id !== windowId));
		};

		browser.tabs.onCreated.addListener(onCreated);
		browser.tabs.onRemoved.addListener(onRemoved);
		browser.tabs.onUpdated.addListener(onUpdated);
		browser.tabs.onActivated.addListener(onActivated);
		browser.tabs.onMoved.addListener(onMoved);
		browser.tabs.onDetached.addListener(onDetached);
		browser.tabs.onAttached.addListener(onAttached);
		browser.windows.onRemoved.addListener(onWindowRemoved);

		onCleanup(() => {
			browser.tabs.onCreated.removeListener(onCreated);
			browser.tabs.onRemoved.removeListener(onRemoved);
			browser.tabs.onUpdated.removeListener(onUpdated);
			browser.tabs.onActivated.removeListener(onActivated);
			browser.tabs.onMoved.removeListener(onMoved);
			browser.tabs.onDetached.removeListener(onDetached);
			browser.tabs.onAttached.removeListener(onAttached);
			browser.windows.onRemoved.removeListener(onWindowRemoved);
		});
	});

	const tabCount = createMemo(() => Object.keys(tabs).length);

	return (
		<TabsContext.Provider
			value={{ tabs, setTabs, pendingMoves, tabCount, windowOrder }}
		>
			{props.children}
		</TabsContext.Provider>
	);
}
