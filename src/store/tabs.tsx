import type { ParentProps } from "solid-js";
import type { Browser } from "wxt/browser";
import type { OnActivatedInfoFirefox, Tab } from "@/types";
import { isTabDiscardable, isValidTab } from "@/utils/helper";

interface TabMovePreview {
	tabId: number;
	targetId: number;
	fromWindowId: number;
	toWindowId: number;
}

interface TabCollection {
	windowIds: () => number[];
	tabsForWindow: (windowId: number, search?: string) => Tab[];
	tabCount: (search?: string) => number;
	duplicateCount: () => number;
	loadedCount: () => number;
	aiCount: () => number;
	duplicateCountForWindow: (windowId: number, search?: string) => number;
	loadedCountForWindow: (windowId: number, search?: string) => number;

	discardLoadedTabs: () => Promise<void>;
	removeDuplicateTabs: () => Promise<void>;
	removeAiTabs: () => Promise<void>;
	removeMatchingTabs: (search: string) => Promise<void>;
	removeWindowDuplicateTabs: (
		windowId: number,
		search?: string,
	) => Promise<void>;
	discardWindowLoadedTabs: (windowId: number, search?: string) => Promise<void>;
	closeWindow: (windowId: number) => Promise<void>;
	discardTab: (tabId: number) => Promise<void>;
	focusTab: (tabId: number, windowId: number) => Promise<void>;
	closeTab: (tabId: number) => Promise<void>;
	previewTabMove: (move: TabMovePreview) => void;
	commitTabMove: (tabId: number, windowId: number) => Promise<void>;
}

const TabsContext = createContext<TabCollection>();

export function useTabsContext(): TabCollection {
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

function normalizeSearch(search = ""): string {
	return search.toLowerCase().trim();
}

function matchesSearch(tab: Tab, search = ""): boolean {
	const needle = normalizeSearch(search);
	if (!needle) return true;

	return (
		tab.title?.toLowerCase().includes(needle) ||
		tab.url.toLowerCase().includes(needle)
	);
}

function tabIds(tabs: Tab[]): number[] {
	return tabs.map((tab) => tab.id);
}

export function TabsProvider(props: ParentProps) {
	const [tabs, setTabs] = createStore<Record<number, Tab>>({});
	const [tabsByWindow, setTabsByWindow] = createStore<Record<number, number[]>>(
		{},
	);

	const [data] = createResource(async () => browser.tabs.query({}));

	const pendingMoves = new Set<number>();

	const allTabs = () => Object.values(tabs);
	const tabsForWindow = (windowId: number, search = "") =>
		(tabsByWindow[windowId] ?? [])
			.map((id) => tabs[id])
			.filter(Boolean)
			.filter((tab) => matchesSearch(tab, search));
	const matchingTabs = (search = "") =>
		allTabs().filter((tab) => matchesSearch(tab, search));
	const duplicateTabs = (source = allTabs()) =>
		source.filter((tab) => tab.isDuplicate);
	const loadedTabs = (source = allTabs()) => source.filter(isTabDiscardable);
	const aiTabs = (source = allTabs()) => source.filter((tab) => tab.isAI);

	const removeWindow = (windowId: number) => {
		setTabsByWindow(
			produce((state) => {
				delete state[windowId];
			}),
		);
	};

	const tabCollection: TabCollection = {
		windowIds: () => Object.keys(tabsByWindow).map(Number),
		tabsForWindow,
		tabCount: (search = "") => matchingTabs(search).length,
		duplicateCount: () => duplicateTabs().length,
		loadedCount: () => loadedTabs().length,
		aiCount: () => aiTabs().length,
		duplicateCountForWindow: (windowId, search = "") =>
			duplicateTabs(tabsForWindow(windowId, search)).length,
		loadedCountForWindow: (windowId, search = "") =>
			loadedTabs(tabsForWindow(windowId, search)).length,

		discardLoadedTabs: async () => {
			await Promise.all(
				tabIds(loadedTabs()).map((id) => browser.tabs.discard(id)),
			);
		},
		removeDuplicateTabs: async () => {
			await browser.tabs.remove(tabIds(duplicateTabs()));
		},
		removeAiTabs: async () => {
			await browser.tabs.remove(tabIds(aiTabs()));
		},
		removeMatchingTabs: async (search: string) => {
			if (!normalizeSearch(search)) return;
			await browser.tabs.remove(tabIds(matchingTabs(search)));
		},
		removeWindowDuplicateTabs: async (windowId, search = "") => {
			await browser.tabs.remove(
				tabIds(duplicateTabs(tabsForWindow(windowId, search))),
			);
		},
		discardWindowLoadedTabs: async (windowId, search = "") => {
			await Promise.all(
				tabIds(loadedTabs(tabsForWindow(windowId, search))).map((id) =>
					browser.tabs.discard(id),
				),
			);
		},
		closeWindow: async (windowId: number) => {
			await browser.windows.remove(windowId);
		},
		discardTab: async (tabId: number) => {
			await browser.tabs.discard(tabId);
		},
		focusTab: async (tabId: number, windowId: number) => {
			await browser.tabs.update(tabId, { active: true });
			await browser.windows.update(windowId, { focused: true });
		},
		closeTab: async (tabId: number) => {
			await browser.tabs.remove(tabId);
		},
		previewTabMove: ({ tabId, targetId, fromWindowId, toWindowId }) => {
			if (fromWindowId === toWindowId) {
				setTabsByWindow(fromWindowId, (ids) => {
					const fromIndex = ids.indexOf(tabId);
					const toIndex = ids.indexOf(targetId);

					if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
						return ids;
					}

					const next = [...ids];
					const [removed] = next.splice(fromIndex, 1);
					next.splice(toIndex, 0, removed);

					return next;
				});
				return;
			}

			const fromTabs = [...(tabsByWindow[fromWindowId] ?? [])];
			const toTabs = [...(tabsByWindow[toWindowId] ?? [])];
			const fromIndex = fromTabs.indexOf(tabId);
			const toIndex = toTabs.indexOf(targetId);

			if (fromIndex === -1 || toIndex === -1) return;

			fromTabs.splice(fromIndex, 1);
			toTabs.splice(toIndex, 0, tabId);

			batch(() => {
				setTabsByWindow(fromWindowId, fromTabs);
				setTabsByWindow(toWindowId, toTabs);
				setTabs(tabId, "windowId", toWindowId);
			});
		},
		commitTabMove: async (tabId: number, windowId: number) => {
			const index = tabsByWindow[windowId]?.indexOf(tabId);

			if (windowId == null || index == null || index === -1) return;

			pendingMoves.add(tabId);
			try {
				await browser.tabs.move(tabId, { windowId, index });
			} finally {
				pendingMoves.delete(tabId);
			}
		},
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
			} else {
				tab.isDuplicate = false;
			}
			tab.isAI = isAiTab(tab.url);
		}

		const byWindow: Record<number, number[]> = {};
		for (const tab of valid) {
			if (!byWindow[tab.windowId]) byWindow[tab.windowId] = [];
			byWindow[tab.windowId].push(tab.id);
		}

		batch(() => {
			setTabs(tabsWithFlags);
			setTabsByWindow(reconcile(byWindow));
		});
	});

	onMount(() => {
		const onCreated = (tab: Browser.tabs.Tab) => {
			if (!isValidTab(tab)) return;
			if (pendingMoves.has(tab.id)) return;

			const existing = allTabs().find(
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
				if (!removedTab) return;
				const windowId = removedTab.windowId;

				const nextTabsByWindow = (tabsByWindow[windowId] ?? []).filter(
					(id) => id !== tabId,
				);

				const remainingTabs = Object.values(tabs).filter((t) => t.id !== tabId);

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

			const { windowId, fromIndex, toIndex } = info;

			const groupTabs = [...tabsByWindow[windowId]];
			const [removed] = groupTabs.splice(fromIndex, 1);
			groupTabs.splice(toIndex, 0, removed);

			setTabsByWindow(windowId, groupTabs);
		};

		const onDetached = (tabId: number, info: Browser.tabs.OnDetachedInfo) => {
			if (pendingMoves.has(tabId)) return;
			const { oldWindowId } = info;

			const nextTabsByWindow = (tabsByWindow[oldWindowId] ?? []).filter(
				(id) => id !== tabId,
			);

			setTabsByWindow(oldWindowId, nextTabsByWindow);

			// Remove the window if this tab was alone
			if (nextTabsByWindow.length === 0) {
				removeWindow(oldWindowId);
			}
		};

		const onAttached = (tabId: number, info: Browser.tabs.OnAttachedInfo) => {
			if (pendingMoves.has(tabId)) return;

			const { newWindowId, newPosition } = info;

			batch(() => {
				setTabs(tabId, "windowId", newWindowId);
				setTabsByWindow(newWindowId, (arr) => {
					const copy = [...(arr || [])];
					copy.splice(newPosition, 0, tabId);
					return copy;
				});
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
		<TabsContext.Provider value={tabCollection}>
			{props.children}
		</TabsContext.Provider>
	);
}
