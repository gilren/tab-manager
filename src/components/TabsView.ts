import type { PublicPath } from "wxt/browser";
import type { Tab, TabItemOptions, TabsViewConfig } from "~/types";

function getIconForTab(favIconUrl: string | undefined): string {
	if (!favIconUrl) {
		return browser.runtime.getURL("icons/none.svg" as PublicPath);
	}

	if (favIconUrl.startsWith("chrome://mozapps")) {
		return browser.runtime.getURL("icons/default.svg" as PublicPath);
	}

	return favIconUrl;
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

	const favicon = document.createElement("img");
	favicon.className = "tab-favicon";
	favicon.src = getIconForTab(tab.favIconUrl);
	favicon.alt = "";

	const main = document.createElement("div");
	main.className = "tab-main";

	const title = document.createElement("span");
	title.className = isDuplicate ? "tab-title dimmed" : "tab-title";
	title.textContent = tab.title || "Untitled";

	const url = document.createElement("span");
	url.className = "tab-url";
	url.textContent = tab.url;

	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.className = "tab-close";
	closeBtn.textContent = "\u00d7";

	main.appendChild(title);
	main.appendChild(url);
	el.appendChild(favicon);
	el.appendChild(main);
	el.appendChild(closeBtn);

	el.addEventListener("click", () => onActivate(tab.id, windowId));
	closeBtn.addEventListener("click", (e) => {
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

	const byWindow = new Map<number, Tab[]>();
	for (const tab of tabs) {
		const group = byWindow.get(tab.windowId);
		if (group) {
			group.push(tab);
		} else {
			byWindow.set(tab.windowId, [tab]);
		}
	}

	const fragment = document.createDocumentFragment();

	for (const [windowId, windowTabs] of byWindow) {
		const isCollapsed = collapsedWindows.has(windowId);

		const wrapper = document.createElement("div");
		wrapper.className = "window-group";

		const header = document.createElement("div");
		header.className = "window-header";
		header.setAttribute("data-window", String(windowId));
		header.innerHTML = `
			<span class="window-toggle${isCollapsed ? " collapsed" : ""}"></span>
			Window ${windowId}
			<span class="window-count">[${windowTabs.length}]</span>
		`;
		header.addEventListener("click", () => onToggleCollapse(windowId));

		const list = document.createElement("ul");
		list.className = `tabs${isCollapsed ? " collapsed" : ""}`;
		list.setAttribute("data-window", String(windowId));

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
