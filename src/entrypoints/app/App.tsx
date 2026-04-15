import { isSortable } from "@dnd-kit/dom/sortable";
import Header from "@/components/Header";
import Window from "@/components/Window";
import { createDragHandlers } from "@/store/drag";
import { TabsProvider, useTabsContext } from "@/store/tabs";
import "solid-devtools";
import { DragDropProvider } from "@dnd-kit/solid";

function TabList() {
	const { tabs, setTabs, pendingMoves, windowOrder } = useTabsContext();
	const [overWindowId, setOverWindowId] = createSignal<number | null>(null);

	const [search, setSearch] = createSignal("");

	const { onDragEnd } = createDragHandlers({
		setTabs,
		pendingMoves,
	});

	const tabCount = createMemo(() => {
		const needle = search().toLowerCase().trim();
		if (!needle) return Object.keys(tabs).length;
		return Object.values(tabs).filter(
			(tab) =>
				tab.title?.toLowerCase().includes(needle) || tab.url.includes(needle),
		).length;
	});

	return (
		<>
			<Header search={search} setSearch={setSearch} tabCount={tabCount} />
			<main>
				<div id="content">
					<DragDropProvider
						onDragOver={(event) => {
							const target = event.operation.target;

							if (!target || !isSortable(target)) return;
							const windowId = target.group as number;

							setOverWindowId(windowId);
						}}
						onDragEnd={(event) => {
							setOverWindowId(null);
							onDragEnd(event);
						}}
					>
						<For each={windowOrder}>
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
		<TabsProvider>
			<Suspense fallback={<div>Loading...</div>}>
				<TabList />
			</Suspense>
		</TabsProvider>
	);
}

export default App;
