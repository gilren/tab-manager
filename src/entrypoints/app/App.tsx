import Header from "@/components/Header";
import Window from "@/components/Window";
import { TabsProvider, useTabsContext } from "@/store/tabs";
import "solid-devtools";
import { type DragDropEventHandlers, DragDropProvider } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";

type DragOverEvent = Parameters<
	NonNullable<DragDropEventHandlers["onDragOver"]>
>[0];

type DragEndEvent = Parameters<
	NonNullable<DragDropEventHandlers["onDragEnd"]>
>[0];

function TabList() {
	const tabCollection = useTabsContext();
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
		tabCollection.previewTabMove({
			tabId,
			targetId,
			fromWindowId,
			toWindowId,
		});
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setOverWindowId(null);
		if (event.canceled) return;

		const { source } = event.operation;
		if (!isSortable(source)) return;

		const tabId = source.id as number;
		const windowId = source.group as number;

		await tabCollection.commitTabMove(tabId, windowId);
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
						<For each={tabCollection.windowIds()}>
							{(windowId) => (
								<Window
									id={windowId}
									search={search}
									isDropTarget={overWindowId() === windowId}
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
