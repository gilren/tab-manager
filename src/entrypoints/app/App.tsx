import Header from "@/components/Header";
import Window from "@/components/Window";
import { TabsProvider, useTabsContext } from "@/store/tabs";
import "solid-devtools";
import { type DragDropEventHandlers, DragDropProvider } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { unwrap } from "solid-js/store";

type DragOverEvent = Parameters<
	NonNullable<DragDropEventHandlers["onDragOver"]>
>[0];

type DragEndEvent = Parameters<
	NonNullable<DragDropEventHandlers["onDragEnd"]>
>[0];

function TabList() {
	const { tabsByWindow, pendingMoves, setTabsByWindow, setTabs } =
		useTabsContext();
	const [overWindowId, setOverWindowId] = createSignal<number | null>(null);
	const [search, setSearch] = createSignal("");

	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				document.querySelector<HTMLInputElement>("input.search")?.focus();
			}
			if (e.key === "Escape") {
				setSearch("");
				document.querySelector<HTMLInputElement>("input.search")?.blur();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
	});

	const handleDragOver = (event: DragOverEvent) => {
		const { source, target } = event.operation;

		if (!isSortable(source)) return;
		if (!isSortable(target)) return;

		// Keep Solid in charge of list order instead of letting dnd-kit
		// imperatively reorder the DOM and then reconciling over it.
		event.preventDefault();

		const tabId = source.id as number;
		const targetId = target.id as number;
		const fromWindowId = source.group as number;
		const toWindowId = target.group as number;

		setOverWindowId(toWindowId);

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
		} else {
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
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setOverWindowId(null);
		if (event.canceled) return;

		const { source } = event.operation;
		if (!isSortable(source)) return;

		const tabId = source.id as number;
		const windowId = source.group as number;
		const index = tabsByWindow[windowId]?.indexOf(tabId);

		if (windowId == null || index == null || index === -1) return;

		pendingMoves.add(tabId);
		try {
			await browser.tabs.move(tabId, { windowId, index });
		} finally {
			pendingMoves.delete(tabId);
		}
	};

	return (
		<>
			<Header search={search} setSearch={setSearch} />
			<main>
				<div id="content">
					<DragDropProvider
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
					>
						<For each={unwrap(Object.keys(tabsByWindow))}>
							{(windowId) => (
								<Window
									id={Number(windowId)}
									search={search}
									isDropTarget={overWindowId() === Number(windowId)}
								/>
							)}
						</For>
					</DragDropProvider>
				</div>
			</main>
		</>
	);
}

function App() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<TabsProvider>
				<TabList />
			</TabsProvider>
		</Suspense>
	);
}

export default App;
