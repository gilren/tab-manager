import type { Accessor } from "solid-js";
import { useTabsContext } from "@/store/tabs";

interface WindowProps {
	id: number;
	search: Accessor<string>;
	isDropTarget: boolean;
}

export default function Window(props: WindowProps) {
	const { tabs, tabsByWindow } = useTabsContext();

	const myTabs = createMemo(() => {
		const needle = props.search().toLowerCase().trim();
		const windowTabs = tabsByWindow[props.id];
		const mTabs = windowTabs.map((id) => tabs[id]).filter(Boolean);
		console.log("WINDOW RERENDER", props.id);
		// console.log(windowTabs);
		// console.log(mTabs);
		return mTabs.filter(
			(tab) =>
				!needle ||
				tab.title?.toLowerCase().includes(needle) ||
				tab.url.includes(needle),
		);
	});

	// createEffect(() => {
	// 	console.log(myTabs());
	// });
	// createEffect(() => {
	// 	const currentOrder = tabsByWindow[props.id];
	// 	console.log(`Window ${props.id} updated, length:`, currentOrder?.length);
	// 	console.log("Full Order:", unwrap(currentOrder));
	// });
	const loadedTabs = createMemo(() => myTabs().filter((tab) => !tab.discarded));

	const duplicatesIds = createMemo(() =>
		myTabs()
			.filter((t) => t.isDuplicate)
			.map((t) => t.id),
	);

	const handleDuplicated = async (event: MouseEvent) => {
		event.stopPropagation();
		await browser.tabs.remove(duplicatesIds());
	};

	const handleLoaded = async (event: MouseEvent) => {
		event.stopPropagation();
		await Promise.all(loadedTabs().map((tab) => browser.tabs.discard(tab.id)));
	};

	const handleClose = async (event: MouseEvent, id: number) => {
		event.stopPropagation();
		await browser.windows.remove(id);
	};

	return (
		<Show when={myTabs().length > 0}>
			<div
				class="window-group"
				classList={{ "window-drop-target": props.isDropTarget }}
			>
				<div class="window-header">
					<div>
						Window {props.id}{" "}
						<span class="window-count">[{myTabs().length}]</span>
					</div>
					<div class="window__actions">
						<Show when={duplicatesIds().length > 0}>
							<button
								type="button"
								class="tab__btn tab__btn--duplicated"
								onclick={(event) => handleDuplicated(event)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<title>Remove duplicated tabs</title>
									<path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
									<path d="m5.082 11.09 8.828 8.828" />
								</svg>
							</button>
						</Show>
						<Show when={loadedTabs().length > 1}>
							<button
								type="button"
								class="tab__btn tab__btn--loaded"
								onclick={(event) => handleLoaded(event)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<title>Unload tabs</title>
									<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
								</svg>
							</button>
						</Show>
						<Show when={props.search().trim().length === 0}>
							<button
								type="button"
								class="tab__btn tab__btn--close"
								onclick={(event) => handleClose(event, props.id)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<title>Close Window</title>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
									<path d="M3 6h18" />
									<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
								</svg>
							</button>
						</Show>
					</div>
				</div>

				<ul class="tabs">
					<For each={myTabs()}>
						{(tab, index) => (
							<TabItem tab={tab} index={index()} windowId={props.id} />
						)}
					</For>
				</ul>

				{/* <ul class="tabs">
				<For each={tabsByWindow[props.id]}>
					{(tabId) => {
						// Access the tab object directly inside the loop
						// This ensures 'tab' is a stable proxy from the store
						const tab = tabs[tabId];
						return (
							<TabItem
								tab={tab}
								windowId={props.id}
								isActive={tabId === activeTabId()}
							/>
						);
					}}
				</For>
			</ul> */}
			</div>
		</Show>
	);
}
