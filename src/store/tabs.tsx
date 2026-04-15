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
	tabsByWindow: Accessor<Map<number, Tab[]>>;
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
				.map((tab) => tab.windowId)
				.filter(
					(windowId, index, allWindowIds) =>
						allWindowIds.indexOf(windowId) === index,
				);
			setWindowOrder(windowIds);

			const valid = raw.filter(isValidTab);

			const tabsWithFlags: Record<number, Tab> = {};
			for (const bt of valid) {
				tabsWithFlags[bt.id] = bt;
			}

			const urlToTabIds = buildUrlToTabIds(Object.values(tabsWithFlags));

			for (const tab of Object.values(tabsWithFlags)) {
				const ids = urlToTabIds.get(tab.url);
				if (ids && ids.length > 1) {
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

			const existing = Object.values(tabs).find(
				(existingTab) => existingTab.url === tab.url,
			);
			tab.isDuplicate = !!existing;

			setTabs(tab.id, tab);
		};

		const onRemoved = (tabId: number) => {
			const removedTab = tabs[tabId];
			if (!removedTab) return;

			const { windowId, index: removedIndex } = removedTab;

			const sameUrlTabs = Object.values(tabs).filter(
				(tab) => tab.url === removedTab.url && tab.id !== tabId,
			);
			const wasOldest =
				sameUrlTabs.length === 0 || sameUrlTabs.every((tab) => tab.id > tabId);

			setTabs(
				produce((tabs) => {
					delete tabs[tabId];

					for (const id in tabs) {
						const tab = tabs[id];
						if (tab.windowId === windowId && tab.index > removedIndex) {
							tab.index--;
						}
					}

					if (wasOldest && sameUrlTabs.length > 0) {
						const nextOldest = sameUrlTabs.reduce((a, b) =>
							a.id < b.id ? a : b,
						);
						tabs[nextOldest.id].isDuplicate = false;
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

			setTabs(
				produce((s) => {
					const prevUrl = s[tab.id]?.url;
					const urlChanged = prevUrl !== tab.url;

					Object.assign(s[tab.id], tab);

					if (urlChanged) {
						const affectedUrls = new Set([prevUrl, tab.url].filter(Boolean));

						for (const url of affectedUrls) {
							const sharing = Object.values(s).filter((t) => t.url === url);
							if (sharing.length <= 1) {
								if (sharing[0]) sharing[0].isDuplicate = false;
							} else {
								const oldestId = Math.min(...sharing.map((t) => t.id));
								for (const t of sharing) {
									t.isDuplicate = t.id !== oldestId;
								}
							}
						}
					}
				}),
			);
		};

		const onActivated = ({ tabId, windowId }: Browser.tabs.OnActivatedInfo) => {
			setTabs(
				produce((tabs) => {
					for (const id in tabs) {
						if (tabs[id].windowId === windowId) {
							tabs[id].active = tabs[id].id === tabId;
						}
					}
				}),
			);
		};

		const onMoved = (tabId: number, info: Browser.tabs.OnMovedInfo) => {
			if (pendingMoves.has(tabId)) return;

			const { windowId, fromIndex, toIndex } = info;

			setTabs(
				produce((tabs) => {
					for (const id in tabs) {
						const tab = tabs[id];
						if (tab.windowId !== windowId) continue;

						if (Number(id) === tabId) {
							tab.index = toIndex;
							continue;
						}

						if (fromIndex < toIndex) {
							if (tab.index > fromIndex && tab.index <= toIndex) tab.index--;
						} else {
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
				produce((tabs) => {
					for (const id in tabs) {
						const tab = tabs[id];
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
				produce((tabs) => {
					for (const id in tabs) {
						const tab = tabs[id];
						if (tab.windowId !== newWindowId) continue;
						if (Number(id) === tabId) continue;
						if (tab.index >= newPosition) tab.index++;
					}

					tabs[tabId].index = newPosition;
					tabs[tabId].windowId = newWindowId;
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

	const tabsByWindow = createMemo(() => {
		const map = new Map<number, Tab[]>();
		for (const tab of Object.values(tabs)) {
			const list = map.get(tab.windowId) ?? [];
			list.push(tab);
			map.set(tab.windowId, list);
		}
		return map;
	});

	return (
		<TabsContext.Provider
			value={{
				tabs,
				setTabs,
				pendingMoves,
				tabCount,
				windowOrder,
				tabsByWindow,
			}}
		>
			{props.children}
		</TabsContext.Provider>
	);
}
