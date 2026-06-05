import { isSortable } from "@dnd-kit/dom/sortable";
import type { DragDropEventHandlers } from "@dnd-kit/solid";
import { useTabsContext } from "./tabs";

type DragEndEvent = Parameters<
	NonNullable<DragDropEventHandlers["onDragEnd"]>
>[0];

export function createOnDragEnd() {
	const { setTabs, tabsByWindow, setTabsByWindow, pendingMoves } =
		useTabsContext();

	return async (event: DragEndEvent) => {
		if (event.canceled) return;
		const { source, target } = event.operation;

		if (!isSortable(source)) return;
		if (!isSortable(target)) return;

		const { initialIndex, index, initialGroup, group } = source;

		console.log(source);
		console.log(target);
		const tabId = source.id as number;
		if (initialGroup == null || group == null) return;

		const fromWindowId = initialGroup as number;
		const toWindowId = group as number;

		if (fromWindowId === toWindowId) {
			setTabsByWindow(fromWindowId, (ids) => {
				const next = [...ids];
				const [removed] = next.splice(initialIndex, 1);
				next.splice(index, 0, removed);
				console.log("EDITED STORE");
				return next;
			});
		} else {
			const fromTabs = [...tabsByWindow[fromWindowId]];
			const toTabs = [...tabsByWindow[toWindowId]];
			fromTabs.splice(initialIndex, 1);
			toTabs.splice(index, 0, tabId);

			batch(() => {
				setTabsByWindow(fromWindowId, fromTabs);
				setTabsByWindow(toWindowId, toTabs);
				setTabs(tabId, "windowId", toWindowId);
			});
		}

		pendingMoves.add(tabId);
		try {
			await browser.tabs.move(tabId, { windowId: group as number, index });
		} finally {
			pendingMoves.delete(tabId);
		}
	};
}
