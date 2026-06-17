import type { ParentProps } from "solid-js";
import type { Browser } from "wxt/browser";
import type { OnActivatedInfoFirefox, Tab } from "@/types";
import {
	extractTabIds,
	groupTabsByUrl,
	isAiTab,
	isTabDiscardable,
	isValidTab,
	matchesSearch,
	normalizeSearch,
} from "@/utils/helper";

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

	focusTab: (tabId: number, windowId: number) => Promise<void>;

	discardTab: (tabId: number) => Promise<void>;
	discardLoadedTabs: () => Promise<void>;
	closeTab: (tabId: number) => Promise<void>;
	closeTabs: (tabIds: number[]) => Promise<void>;
	closeDuplicateTabs: () => Promise<void>;
	closeAiTabs: () => Promise<void>;
	closeSearchedTabs: (search: string) => Promise<void>;
	closeWindow: (windowId: number) => Promise<void>;

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

export function TabsProvider(props: ParentProps) {
	let port: Browser.runtime.Port | undefined;
	const [tabs, setTabs] = createStore<Record<number, Tab>>({});
	const [tabsByWindow, setTabsByWindow] = createStore<Record<number, number[]>>(
		{},
	);

	const [data] = createResource(async () => browser.tabs.query({}));

	// Moves triggered by commitTabMove also emit browser move/detach/attach events.
	// Keep their IDs here so those event handlers don't apply the same change twice.
	const pendingMoves = new Set<number>();

	const allTabs = createMemo(() => Object.values(tabs));
	const duplicatedTabs = createMemo(() =>
		allTabs().filter((t) => t.isDuplicate),
	);
	const loadedTabs = createMemo(() => allTabs().filter(isTabDiscardable));
	const aiTabs = createMemo(() => allTabs().filter((tab) => tab.isAI));

	const tabsForWindow = (windowId: number, search = "") =>
		(tabsByWindow[windowId] ?? [])
			.map((id) => tabs[id])
			.filter(Boolean)
			.filter((tab) => matchesSearch(tab, search));
	const matchingTabs = (search = "") =>
		allTabs().filter((tab) => matchesSearch(tab, search));

	const removeWindow = (windowId: number) => {
		setTabsByWindow(
			produce((state) => {
				delete state[windowId];
			}),
		);
	};

	const closeTab = (tabId: number) => browser.tabs.remove(tabId);
	const closeTabs = (tabIds: number[]) => browser.tabs.remove(tabIds);

	const tabCollection: TabCollection = {
		windowIds: () => Object.keys(tabsByWindow).map(Number),
		tabsForWindow,
		tabCount: (search = "") => matchingTabs(search).length,
		duplicateCount: () => duplicatedTabs().length,
		loadedCount: () => loadedTabs().length,
		aiCount: () => aiTabs().length,

		focusTab: async (tabId: number, windowId: number) => {
			await browser.tabs.update(tabId, { active: true });
			await browser.windows.update(windowId, { focused: true });
		},

		discardTab: async (tabId: number) => {
			await browser.tabs.discard(tabId);
		},
		discardLoadedTabs: async () => {
			await Promise.all(
				extractTabIds(loadedTabs()).map((id) => browser.tabs.discard(id)),
			);
		},
		closeTab,
		closeTabs,
		closeDuplicateTabs: async () => {
			await closeTabs(extractTabIds(duplicatedTabs()));
		},
		closeAiTabs: async () => {
			await closeTabs(extractTabIds(aiTabs()));
		},
		closeSearchedTabs: async (search: string) => {
			if (!normalizeSearch(search)) return;
			await closeTabs(extractTabIds(matchingTabs(search)));
		},
		closeWindow: async (windowId: number) => {
			await browser.windows.remove(windowId);
		},

		previewTabMove: ({ tabId, targetId, fromWindowId, toWindowId }) => {
			// Optimistically update local ordering while the user drags a tab.
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

			// Cross-window moves also need the tab's windowId updated in the tab store.
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

			// Browser APIs will emit follow-up move events; pendingMoves tells handlers
			// this state change was already previewed locally.
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

		// Keep the oldest tab for each URL; mark newer tabs with that URL as
		// duplicates.
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

		const trimmedTabs = allTabs.map((el) => ({
			id: el.id,
			title: el.title,
			url: el.url,
		}));

		batch(() => {
			setTabs(tabsWithFlags);
			setTabsByWindow(reconcile(byWindow));

			// Keep the native helper in sync without sending full browser tab objects.
			port?.postMessage({ type: "snapshot tabs", tabs: trimmedTabs });
			port?.postMessage({ type: "snapshot windows", tabs: byWindow });
		});
	});

	const handleTabCreated = (tab: Browser.tabs.Tab) => {
		if (!isValidTab(tab)) return;
		if (pendingMoves.has(tab.id)) return;

		const existing = allTabs().find(
			(existingTab) => existingTab.url === tab.url,
		);

		const newTab: Tab = {
			...tab,
			isDuplicate: !!existing,
			isAI: isAiTab(tab.url),
		};

		port?.postMessage({
			type: "tabCreated",
			tabId: newTab.id,
			url: newTab.url,
		});

		batch(() => {
			setTabs(newTab.id, newTab);
			setTabsByWindow(tab.windowId, (tabs = []) => [...tabs, newTab.id]);
		});
	};

	const handleTabRemoved = (tabId: number) => {
		batch(() => {
			const removedTab = tabs[tabId];
			if (!removedTab) return;
			const windowId = removedTab.windowId;

			const nextTabsByWindow = (tabsByWindow[windowId] ?? []).filter(
				(id) => id !== tabId,
			);

			const remainingTabs = Object.values(tabs).filter((t) => t.id !== tabId);

			// If the removed tab was the oldest copy of a URL, another tab may stop
			// being duplicate.
			const sameUrlTabs = remainingTabs.filter((t) => t.url === removedTab.url);

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

	const handleTabUpdated = (
		_: number,
		info: Browser.tabs.OnUpdatedInfo,
		tab: Browser.tabs.Tab,
	) => {
		if (!isValidTab(tab)) return;
		if (pendingMoves.has(tab.id)) return;

		// Ignore frequent update noise like title/favIcon changes.
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

				// A URL change can affect duplicate status for both the old and new URL
				// groups.
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

	const handleTabActivated = ({
		tabId,
		previousTabId,
	}: OnActivatedInfoFirefox) => {
		batch(() => {
			setTabs(tabId, "active", true);
			if (previousTabId != null) {
				setTabs(previousTabId, "active", false);
			}
		});
	};

	const handleTabMoved = (tabId: number, info: Browser.tabs.OnMovedInfo) => {
		if (pendingMoves.has(tabId)) return;

		const { windowId, fromIndex, toIndex } = info;

		const groupTabs = [...tabsByWindow[windowId]];
		const [removed] = groupTabs.splice(fromIndex, 1);
		groupTabs.splice(toIndex, 0, removed);

		setTabsByWindow(windowId, groupTabs);
	};

	const handleTabDetached = (
		tabId: number,
		info: Browser.tabs.OnDetachedInfo,
	) => {
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

	const handleTabAttached = (
		tabId: number,
		info: Browser.tabs.OnAttachedInfo,
	) => {
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

	const handleWindowRemoved = (windowId: number) => {
		removeWindow(windowId);
	};

	const handleNativeMessage = (response: unknown) => {
		if (typeof response === "object" && response !== null) {
			console.log(`Received: ${JSON.stringify(response)}`);
		}
	};

	onMount(() => {
		try {
			port = browser.runtime.connectNative("tab_manager");
		} catch (err) {
			console.error("Failed to connect to native host 'tab_manager':", err);
		}

		browser.tabs.onCreated.addListener(handleTabCreated);
		browser.tabs.onRemoved.addListener(handleTabRemoved);
		browser.tabs.onUpdated.addListener(handleTabUpdated);
		browser.tabs.onActivated.addListener(handleTabActivated);
		browser.tabs.onMoved.addListener(handleTabMoved);
		browser.tabs.onDetached.addListener(handleTabDetached);
		browser.tabs.onAttached.addListener(handleTabAttached);
		browser.windows.onRemoved.addListener(handleWindowRemoved);
		port?.onMessage.addListener(handleNativeMessage);

		onCleanup(() => {
			browser.tabs.onCreated.removeListener(handleTabCreated);
			browser.tabs.onRemoved.removeListener(handleTabRemoved);
			browser.tabs.onUpdated.removeListener(handleTabUpdated);
			browser.tabs.onActivated.removeListener(handleTabActivated);
			browser.tabs.onMoved.removeListener(handleTabMoved);
			browser.tabs.onDetached.removeListener(handleTabDetached);
			browser.tabs.onAttached.removeListener(handleTabAttached);
			browser.windows.onRemoved.removeListener(handleWindowRemoved);
			port?.onMessage.removeListener(handleNativeMessage);
		});
	});

	return (
		<TabsContext.Provider value={tabCollection}>
			{props.children}
		</TabsContext.Provider>
	);
}
