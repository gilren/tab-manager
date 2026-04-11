import type { PublicPath } from "wxt/browser";
import type { Tab, TabItemOptions, TabsViewConfig } from "~/types";

function getIconForTab(favIconUrl: string): string {
	if (!favIconUrl) {
		return browser.runtime.getURL("icons/none.svg" as PublicPath);
	}

	if (favIconUrl.startsWith("chrome://mozapps")) {
		return browser.runtime.getURL("icons/default.svg" as PublicPath);
	}

	return favIconUrl;
}

function esc(str: string): string {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function renderTabItem(opts: TabItemOptions): HTMLLIElement {
	const { tab, windowId, isDuplicate, isFocused, onActivate, onClose } = opts;

	const el = document.createElement("li");

	el.className = [
		"tab",
		tab.active && "tab-active",
		tab.pinned && "tab-pinned",
		isDuplicate && "tab-duplicate",
		isFocused && "focused",
	]
		.filter(Boolean)
		.join(" ");

	el.setAttribute("data-tab-id", String(tab.id));
	el.tabIndex = 0;

	const icon = getIconForTab(tab.favIconUrl);

	const favIcon = icon
		? `<img class="tab-favicon" src="${esc(icon)}" alt="">`
		: `<div class="tab-favicon"></div>`;

	const titleClass = isDuplicate ? "tab-title dimmed" : "tab-title";

	el.innerHTML = `
		${favIcon}
		<div class="tab-main">
			<span class="${titleClass}">${esc(tab.title || "Untitled")}</span>
			<span class="tab-url">${esc(tab.url || "")}</span>
		</div>

		<button type="button" class="tab-close" data-id="${tab.id}">&times;</button>
	`;

	el.addEventListener("click", () => onActivate(tab.id, windowId));
	el.querySelector(".tab-close")?.addEventListener("click", (e) => {
		e.stopPropagation();
		onClose(tab.id);
	});

	return el;
}

export function setupTabsView(element: HTMLElement, config: TabsViewConfig) {
	const {
		tabs,
		duplicates,
		collapsedWindows,
		focusedTabId,
		onToggleCollapse,
		onActivateTab,
		onCloseTab,
	} = config;

	if (tabs.length === 0) {
		element.innerHTML = '<div class="no-results">No tabs found</div>';
		return;
	}

	const byWindow: Record<number, Tab[]> = {};
	for (const tab of tabs) {
		if (!byWindow[tab.windowId]) byWindow[tab.windowId] = [];
		byWindow[tab.windowId].push(tab);
	}

	const fragment = document.createDocumentFragment();

	for (const [wid, windowTabs] of Object.entries(byWindow)) {
		const windowId = parseInt(wid, 10);
		const isCollapsed = collapsedWindows.has(windowId);

		const wrapper = document.createElement("div");
		wrapper.className = "window-group";

		const header = document.createElement("div");
		header.className = "window-header";
		header.setAttribute("data-window", wid);
		header.innerHTML = `
			<span class="window-toggle${isCollapsed ? " collapsed" : ""}"></span>
			Window ${wid}
			<span class="window-count">[${windowTabs.length}]</span>
		`;
		header.addEventListener("click", () => onToggleCollapse(windowId));

		const list = document.createElement("ul");
		list.className = `tabs${isCollapsed ? " collapsed" : ""}`;
		list.setAttribute("data-window", wid);

		for (const tab of windowTabs) {
			list.appendChild(
				renderTabItem({
					tab,
					windowId,
					isDuplicate: duplicates.has(tab.url),
					isFocused: focusedTabId === tab.id,
					onActivate: onActivateTab,
					onClose: onCloseTab,
				}),
			);
		}

		wrapper.appendChild(header);
		wrapper.appendChild(list);
		fragment.appendChild(wrapper);
	}

	element.innerHTML = "";
	element.appendChild(fragment);
}
