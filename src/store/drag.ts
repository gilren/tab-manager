import type { DragEndEvent, DragStartEvent } from "@dnd-kit/abstract";
import { SortableDraggable, SortableDroppable } from "@dnd-kit/dom/sortable";

import type { SetStoreFunction } from "solid-js/store";
import type { Tab } from "@/types";

type StartEvent = Parameters<DragStartEvent>[0];
type EndEvent = Parameters<DragEndEvent>[0];

interface DragHandlersInput {
	setTabs: SetStoreFunction<Record<number, Tab>>;

	pendingMoves: Set<number>;
}

interface DragHandlers {
	handleDragStart: (event: StartEvent) => Promise<void>;
	onDragEnd: (event: EndEvent) => Promise<void>;
}

export function createDragHandlers({
	setTabs,
	pendingMoves,
}: DragHandlersInput): DragHandlers {
	let fromWindowId: number | null = null;

	const handleDragStart = async (event: StartEvent) => {
		const { source } = event.operation;
		if (!(source instanceof SortableDraggable)) return;
		fromWindowId = source.group as number;
	};
	const onDragEnd = async (event: EndEvent) => {
		if (event.canceled) return;

		const { source, target } = event.operation;

		if (
			!(source instanceof SortableDraggable) ||
			!(target instanceof SortableDroppable)
		)
			return;

		const tabId = source.id as number;
		// const fromWindowId = source.group as number;
		const fromIndex = source.index;
		const toWindowId = target.group as number;
		const toIndex = target.index;

		// Update store optimistically
		if (fromWindowId === toWindowId) {
			// same window
			setTabs(
				produce((s) => {
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId !== fromWindowId) continue;
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
		} else {
			// cross window
			setTabs(
				produce((s) => {
					// close gap in old window
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId !== fromWindowId) continue;
						if (Number(id) === tabId) continue;
						if (tab.index > fromIndex) tab.index--;
					}
					// make room in new window
					for (const id in s) {
						const tab = s[id];
						if (tab.windowId !== toWindowId) continue;
						if (Number(id) === tabId) continue;
						if (tab.index >= toIndex) tab.index++;
					}
					// update the tab itself
					s[tabId].index = toIndex;
					s[tabId].windowId = toWindowId;
				}),
			);
		}

		pendingMoves.add(tabId);
		try {
			await browser.tabs.move(tabId, { windowId: toWindowId, index: toIndex });
		} finally {
			pendingMoves.delete(tabId);
		}
	};

	return { handleDragStart, onDragEnd };
}
