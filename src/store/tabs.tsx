import type { ParentProps } from "solid-js";
import { type SetStoreFunction, type Store, unwrap } from "solid-js/store";
import type { Browser } from "wxt/browser";
import type { OnActivatedInfoFirefox, Tab } from "@/types";
import { isValidTab } from "@/utils/helper";

interface TabsStore {
	tabs: Store<Record<number, Tab>>;
	setTabs: SetStoreFunction<Record<number, Tab>>;

	tabsByWindow: Store<Record<number, number[]>>;
	setTabsByWindow: SetStoreFunction<Record<number, number[]>>;

	pendingMoves: Set<number>;
}

const TabsContext = createContext<TabsStore>();

export function useTabsContext(): TabsStore {
	const context = useContext(TabsContext);

	if (context === undefined) {
		throw new Error("TabsContext is missing");
	}
	return context;
}

const aiKeywords = ["chatgpt", "claude", "duck.ai", "gemini"];

function isAiTab(url: string): boolean {
	const lower = url.toLowerCase();
	return aiKeywords.some((kw) => lower.includes(kw));
}

function groupTabsByUrl(tabs: Tab[]): Map<string, number[]> {
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
	const [tabsByWindow, setTabsByWindow] = createStore<Record<number, number[]>>(
		{},
	);

	const [data] = createResource(async () => browser.tabs.query({}));

	const [windowOrder, setWindowOrder] = createStore<number[]>([]);
	const pendingMoves = new Set<number>();

	const removeWindow = (windowId: number) => {
		batch(() => {
			setTabsByWindow(
				produce((state) => {
					delete state[windowId];
				}),
			);
			setWindowOrder((ids) => ids.filter((id) => id !== windowId));
		});
	};

	createEffect(() => {
		const allTabs = data();
		if (!allTabs) return;

		const valid = allTabs.filter(isValidTab);

		// Map tabs to {id: Tab}
		const tabsWithFlags: Record<number, Tab> = {};
		for (const bt of valid) {
			tabsWithFlags[bt.id] = bt;
		}

		// Identify duplicates
		const groupedTabIds = groupTabsByUrl(Object.values(tabsWithFlags));

		for (const tab of Object.values(tabsWithFlags)) {
			const ids = groupedTabIds.get(tab.url);
			if (ids && ids.length > 1) {
				const oldestId = Math.min(...ids);
				tab.isDuplicate = tab.id !== oldestId;
			}
			tab.isAI = isAiTab(tab.url);
		}

		// Build window record
		const byWindow: Record<number, number[]> = {};
		allTabs.forEach((tab) => {
			if (tab.windowId != null && tab.id != null) {
				if (!byWindow[tab.windowId]) byWindow[tab.windowId] = [];
				byWindow[tab.windowId].push(tab.id);
			}
		});

		console.log("Running effect from tabs");

		batch(() => {
			setTabs(tabsWithFlags);
			setTabsByWindow(reconcile(byWindow));
		});
	});

	onMount(() => {
		const onCreated = (tab: Browser.tabs.Tab) => {
			if (!isValidTab(tab)) return;
			if (!unwrap(windowOrder).includes(tab.windowId)) {
				setWindowOrder((ids) => [...ids, tab.windowId]);
			}
			if (pendingMoves.has(tab.id)) return;

			console.log("=== onCreated ===");
			const existing = Object.values(unwrap(tabs)).find(
				(existingTab) => existingTab.url === tab.url,
			);

			tab.isDuplicate = !!existing;
			tab.isAI = isAiTab(tab.url);

			batch(() => {
				setTabs(tab.id, tab);
				setTabsByWindow(tab.windowId, (tabs = []) => [...tabs, tab.id]);
			});
		};

		const onRemoved = (tabId: number) => {
			batch(() => {
				const removedTab = tabs[tabId];
				const windowId = removedTab.windowId;

				const nextTabsByWindow = (tabsByWindow[windowId] ?? []).filter(
					(id) => id !== tabId,
				);

				const remainingTabs = Object.values(tabs).filter(
					(t) => t.id !== tabId && t.windowId === windowId,
				);

				const sameUrlTabs = remainingTabs.filter(
					(t) => t.url === removedTab.url,
				);

				const oldestId =
					sameUrlTabs.length > 0
						? Math.min(...sameUrlTabs.map((t) => t.id))
						: null;

				setTabsByWindow(windowId, nextTabsByWindow);

				setTabs(
					produce((tabs) => {
						delete tabs[tabId];

						if (oldestId !== null) {
							for (const t of Object.values(tabs)) {
								if (t.url === removedTab.url) {
									t.isDuplicate = t.id !== oldestId;
								}
							}
						}
					}),
				);

				// Remove the window if this tab was alone
				if (nextTabsByWindow.length === 0) {
					removeWindow(windowId);
				}
			});
		};

		const onUpdated = (
			_: number,
			info: Browser.tabs.OnUpdatedInfo,
			tab: Browser.tabs.Tab,
		) => {
			if (!isValidTab(tab)) return;
			if (pendingMoves.has(tab.id)) return;

			const relevant = ["url", "discarded"];
			if (!Object.keys(info).some((k) => relevant.includes(k))) return;

			console.log("=== onUpdated ===");

			setTabs(
				produce((s) => {
					if (!s[tab.id]) return;

					// Ignore transient about:blank that Firefox sets during tab discard/undiscard
					// If the URL "changed" but is identical to what we have, skip the update
					const prevUrl = s[tab.id].url;
					if (Object.keys(info).includes("url") && prevUrl === tab.url) return;

					Object.assign(s[tab.id], tab);
					s[tab.id].isAI = isAiTab(s[tab.id].url);

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

					console.log("actually batched in onUpdated");
				}),
			);
		};

		const onActivated = ({ tabId, previousTabId }: OnActivatedInfoFirefox) => {
			batch(() => {
				setTabs(tabId, "active", true);
				if (previousTabId != null) {
					setTabs(previousTabId, "active", false);
				}
			});
		};

		const onMoved = (tabId: number, info: Browser.tabs.OnMovedInfo) => {
			if (pendingMoves.has(tabId)) return;

			console.log("=== onMoved ===");

			const { windowId, fromIndex, toIndex } = info;

			const groupTabs = [...tabsByWindow[windowId]];
			const [removed] = groupTabs.splice(fromIndex, 1);
			groupTabs.splice(toIndex, 0, removed);

			setTabsByWindow(windowId, groupTabs);
		};

		const onDetached = (tabId: number, info: Browser.tabs.OnDetachedInfo) => {
			if (pendingMoves.has(tabId)) return;
			const { oldWindowId, oldPosition } = info;

			console.log("=== onDetached ===");

			const nextTabsByWindow = (tabsByWindow[oldWindowId] ?? []).filter(
				(id) => id !== tabId,
			);

			batch(() => {
				setTabs(
					produce((tabs) => {
						for (const id in tabs) {
							const tab = tabs[id];
							if (tab.windowId !== oldWindowId) continue;
							console.log(id);
							if (Number(id) === tabId) continue;
							// TODO: We might not need to do that anymore
							if (tab.index > oldPosition) tab.index--;
						}
					}),
				);
				setTabsByWindow(oldWindowId, nextTabsByWindow);
				// Remove the window if this tab was alone
			});
			if (nextTabsByWindow.length === 0) {
				console.log("je passe");
				removeWindow(oldWindowId);
			}
		};

		const onAttached = (tabId: number, info: Browser.tabs.OnAttachedInfo) => {
			if (pendingMoves.has(tabId)) return;

			const { newWindowId, newPosition } = info;

			console.log("=== onAttached ===");

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
			setTabsByWindow(newWindowId, (arr) => {
				const copy = [...(arr || [])];
				copy.splice(newPosition, 0, tabId);
				return copy;
			});
		};

		const onWindowRemoved = (windowId: number) => {
			removeWindow(windowId);
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

	return (
		<TabsContext.Provider
			value={{
				tabs,
				setTabs,
				pendingMoves,

				tabsByWindow,
				setTabsByWindow,
			}}
		>
			{props.children}
		</TabsContext.Provider>
	);
}
