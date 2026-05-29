import Header from "@/components/Header";
import Window from "@/components/Window";
import { TabsProvider, useTabsContext } from "@/store/tabs";
import "solid-devtools";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { unwrap } from "solid-js/store";
import { createOnDragEnd } from "@/store/drag";

function TabList() {
	const { tabsByWindow, pendingMoves } = useTabsContext();
	const [overWindowId, setOverWindowId] = createSignal<number | null>(null);
	const [search, setSearch] = createSignal("");

	const onDragEnd = createOnDragEnd();

	return (
		<>
			<Header search={search} setSearch={setSearch} />
			<main>
				<div id="content">
					<DragDropProvider
						onDragOver={(event) => {
							// event.preventDefault();
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
