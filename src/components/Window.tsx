import type { Accessor } from "solid-js";
import { useTabsContext } from "@/store/tabs";

interface WindowProps {
	id: number;
	search: Accessor<string>;
	isDropTarget: boolean;
}

export default function Window(props: WindowProps) {
	const tabCollection = useTabsContext();

	const tabs = createMemo(() =>
		tabCollection.tabsForWindow(props.id, props.search()),
	);

	const duplicatedTabs = createMemo(() =>
		tabs().filter((tab) => tab.isDuplicate),
	);
	const duplicateCount = createMemo(() => duplicatedTabs().length);

	const loadedTabs = createMemo(() => tabs().filter(isTabDiscardable));
	const loadedCount = createMemo(() => loadedTabs().length);

	const handleDuplicated = async (event: MouseEvent) => {
		event.stopPropagation();
		await tabCollection.closeTabs(extractTabIds(duplicatedTabs()));
	};

	const handleLoaded = async (event: MouseEvent) => {
		event.stopPropagation();
		await Promise.all(
			extractTabIds(loadedTabs()).map((id) => browser.tabs.discard(id)),
		);
	};

	const handleClose = async (event: MouseEvent) => {
		event.stopPropagation();
		await tabCollection.closeWindow(props.id);
	};

	const handleMatching = async (event: MouseEvent) => {
		event.stopPropagation();
		await tabCollection.closeTabs(extractTabIds(tabs()));
	};

	return (
		<Show when={tabs().length > 0 || props.search().trim().length > 0}>
			<div
				class="window-group"
				classList={{ "window-drop-target": props.isDropTarget }}
			>
				<div class="window-header">
					<div>
						Window {props.id}{" "}
						<span class="window-count">[{tabs().length}]</span>
					</div>
					<div class="window__actions">
						<Show when={props.search().trim().length > 0}>
							<button
								type="button"
								class="tab__btn tab__btn--close"
								onclick={(event) => handleMatching(event)}
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
									class="lucide lucide-search-x-icon lucide-search-x"
								>
									<title>Close matching tabs</title>
									<path d="m13.5 8.5-5 5" />
									<path d="m8.5 8.5 5 5" />
									<circle cx="11" cy="11" r="8" />
									<path d="m21 21-4.3-4.3" />
								</svg>
							</button>
						</Show>
						<Show when={duplicateCount() > 0}>
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
									<title>Close duplicated tabs</title>
									<path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
									<path d="m5.082 11.09 8.828 8.828" />
								</svg>
							</button>
						</Show>
						<Show when={loadedCount() > 1}>
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
								onclick={(event) => handleClose(event)}
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
					<For each={tabs()}>
						{(tab, index) => (
							<TabItem tab={tab} index={index()} windowId={props.id} />
						)}
					</For>
				</ul>
			</div>
		</Show>
	);
}
