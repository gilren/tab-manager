import "./style.css";

import { setupSearchBar } from "~/components/SearchBar";
import { setupStats } from "~/components/Stats";
import { setupTabsView } from "~/components/TabsView";
import { useTabService } from "~/composables/useTabService";
import { tabState } from "~/composables/useTabState";

const searchEl = document.getElementById("search") as HTMLInputElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
const statsEl = document.getElementById("stats") as HTMLElement;
const contentEl = document.getElementById("content") as HTMLElement;
const dupBtn = document.getElementById("dup-btn") as HTMLButtonElement;

const tabService = useTabService(tabState.loadTabs.bind(tabState));

function render() {
	const allTabs = tabState.allTabs;
	const filter = tabState.filter;

	const needle = filter.toLowerCase();
	const filtered = needle
		? allTabs.filter(
				(t) =>
					(t.title || "").toLowerCase().includes(needle) ||
					t.url.toLowerCase().includes(needle),
			)
		: allTabs;

	setupStats(statsEl, { count: filtered.length });

	const duplicates = tabService.findDuplicates(allTabs);

	dupBtn.disabled = duplicates.size === 0;
	dupBtn.title =
		duplicates.size === 0 ? "No duplicates found" : "Remove duplicate tabs";

	setupTabsView(contentEl, {
		tabs: filtered,
		duplicates,
		collapsedWindows: tabState.collapsedWindows,
		focusedTabId: tabState.focusedTabId,
		onToggleCollapse: (wid: number) => {
			tabState.toggleCollapsedWindow(wid);
			render();
		},
		onActivateTab: (tabId: number, windowId: number) =>
			tabService.activateTab(tabId, windowId),
		onCloseTab: async (tabId: number) => {
			try {
				await tabService.closeTab(tabId);
			} catch (e) {
				console.error(e);
			}
		},
	});
}

function getTabElements(): Element[] {
	return Array.from(contentEl.querySelectorAll(".tab"));
}

function focusTab(tabEl: Element | null): void {
	const prev = contentEl.querySelector(".tab.focused");
	if (prev) prev.classList.remove("focused");

	if (tabEl) {
		tabEl.classList.add("focused");
		(tabEl as HTMLElement).focus();
		const raw = tabEl.getAttribute("data-tab-id");
		const parsed = raw !== null ? parseInt(raw, 10) : NaN;
		tabState.setFocusedTabId(Number.isFinite(parsed) ? parsed : null);
		tabEl.scrollIntoView({ block: "nearest" });
	} else {
		tabState.setFocusedTabId(null);
	}
}

function focusNext(delta: number): void {
	const tabs = getTabElements();
	if (tabs.length === 0) return;

	let idx = tabs.findIndex((t) => t.classList.contains("focused"));
	if (idx === -1) idx = delta > 0 ? 0 : tabs.length - 1;
	else idx = (idx + delta + tabs.length) % tabs.length;
	focusTab(tabs[idx]);
}

async function activateFocused(): Promise<void> {
	const focusedTabId = tabState.focusedTabId;
	if (focusedTabId === null) return;

	const tab = tabState.allTabs.find((t) => t.id === focusedTabId);
	if (tab) {
		await tabService.activateTab(tab.id, tab.windowId);
	}
}

async function closeFocused(): Promise<void> {
	const focusedTabId = tabState.focusedTabId;
	if (focusedTabId === null) return;

	await tabService.closeTab(focusedTabId);
}

async function removeDuplicates(): Promise<void> {
	await tabService.removeDuplicates(tabState.allTabs);
}

setupSearchBar(searchEl, {
	initialValue: tabState.filter,
	onSearch: (value) => {
		tabState.setFilter(value);
		render();
	},
	clearButton: clearBtn,
});

document.addEventListener("keydown", (e) => {
	if (e.target === searchEl) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			searchEl.blur();
			focusNext(1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			searchEl.blur();
			focusNext(-1);
		}
		return;
	}

	if (e.key === "ArrowDown" || e.key === "ArrowUp") {
		e.preventDefault();
		focusNext(e.key === "ArrowDown" ? 1 : -1);
	} else if (e.key === "Enter") {
		activateFocused();
	} else if (e.key === "Delete" || e.key === "Backspace") {
		closeFocused();
	} else if (e.key === "Escape") {
		tabState.setFocusedTabId(null);
		const focused = contentEl.querySelector(".tab.focused");
		if (focused) focused.classList.remove("focused");
		searchEl.focus();
	}
});

dupBtn.addEventListener("click", removeDuplicates);

(async () => {
	try {
		await tabState.loadTabs();
		render();
	} catch (e) {
		console.error(e);
	}
})();

tabState.subscribe(render);
