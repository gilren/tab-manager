import { isSortable } from "@dnd-kit/dom/sortable";
import type { DragDropEventHandlers } from "@dnd-kit/solid";
import type { SetStoreFunction } from "solid-js/store";
import type { Tab } from "@/types";

interface DragHandlersInput {
	setTabs: SetStoreFunction<Record<number, Tab>>;
	pendingMoves: Set<number>;
}

type DragEndEvent = Parameters<
	NonNullable<DragDropEventHandlers["onDragEnd"]>
>[0];

interface DragHandlers {
	onDragEnd: (event: DragEndEvent) => Promise<void>;
}

export function createDragHandlers({
	setTabs,
	pendingMoves,
}: DragHandlersInput): DragHandlers {
	const onDragEnd = async (event: DragEndEvent) => {
		if (event.canceled) return;

		const { source } = event.operation;

		if (!isSortable(source)) return;
		const { initialIndex, index, initialGroup, group } = source;

		const tabId = source.id as number;

		if (initialGroup == null || group == null) return;

		if (initialGroup === group) {
			setTabs(
				produce((tabs) => {
					for (const id in tabs) {
						const tab = tabs[id];
						if (tab.windowId !== initialGroup) continue;
						if (Number(id) === tabId) {
							tab.index = index;
							continue;
						}
						if (initialIndex < index) {
							if (tab.index > initialIndex && tab.index <= index) tab.index--;
						} else {
							if (tab.index >= index && tab.index < initialIndex) tab.index++;
						}
					}
				}),
			);
		} else {
			setTabs(
				produce((tabs) => {
					for (const id in tabs) {
						const tab = tabs[id];
						if (tab.windowId !== initialGroup) continue;
						if (Number(id) === tabId) continue;
						if (tab.index > initialIndex) tab.index--;
					}
					for (const id in tabs) {
						const tab = tabs[id];
						if (tab.windowId !== group) continue;
						if (Number(id) === tabId) continue;
						if (tab.index >= index) tab.index++;
					}
					tabs[tabId].index = index;
					tabs[tabId].windowId = group as number;
				}),
			);
		}

		pendingMoves.add(tabId);
		try {
			await browser.tabs.move(tabId, {
				windowId: group as number,
				index: index,
			});
		} finally {
			pendingMoves.delete(tabId);
		}
	};

	return { onDragEnd };
}
