import Header from "@/components/Header";
import Window from "@/components/Window";
import { TabsProvider, useTabsContext } from "@/store/tabs";
import "solid-devtools";
import { DragDropProvider } from "@dnd-kit/solid";
import { isSortable } from "@dnd-kit/solid/sortable";
import { unwrap } from "solid-js/store";
import { createOnDragEnd } from "@/store/drag";

function TabList() {
	const { tabsByWindow } = useTabsContext();
	const [overWindowId, setOverWindowId] = createSignal<number | null>(null);
	const [search, setSearch] = createSignal("");

	const onDragEnd = createOnDragEnd();

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
