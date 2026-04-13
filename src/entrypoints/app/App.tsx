import Header from "@/components/Header";
import Window from "@/components/Window";
import { createDragHandlers } from "@/store/drag";
import { TabsProvider, useTabsContext } from "@/store/tabs";
import "solid-devtools";
import { DragDropProvider } from "@dnd-kit/solid";

function TabList() {
	const { tabs, setTabs, pendingMoves, windowOrder } = useTabsContext();
	const [search, setSearch] = createSignal("");

	const { handleDragStart, onDragEnd } = createDragHandlers({
		setTabs,
		pendingMoves,
	});

	const tabCount = createMemo(() => {
		const needle = search().toLowerCase().trim();
		if (!needle) return Object.keys(tabs).length;
		return Object.values(tabs).filter(
			(t) => t.title?.toLowerCase().includes(needle) || t.url.includes(needle),
		).length;
	});

	// createEffect(() => {
	// 	derived(); // access
	// 	performance.mark("derived-recompute");
	// });

	return (
		<>
			<Header search={search} setSearch={setSearch} tabCount={tabCount} />
			<main>
				<div id="content">
					<DragDropProvider
						onDragStart={handleDragStart}
						// onDragOver={() => {}}
						onDragEnd={onDragEnd}
					>
						<For each={windowOrder}>
							{(windowId, i) => (
								<Window id={windowId} index={i()} search={search} />
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
