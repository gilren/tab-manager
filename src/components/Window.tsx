import { CollisionPriority } from "@dnd-kit/abstract";
import { useSortable } from "@dnd-kit/solid/sortable";
import type { Accessor } from "solid-js";
import { useTabsContext } from "@/store/tabs";

interface WindowProps {
	id: number;
	index: number;
	search: Accessor<string>;
}

export default function Window(props: WindowProps) {
	const { tabs } = useTabsContext();
	const { ref, isDropTarget } = useSortable({
		get id() {
			return props.id;
		},
		get index() {
			return props.index;
		},
		type: "window",
		accept: ["tab"],
		collisionPriority: CollisionPriority.Low,
	});

	const myTabs = createMemo(() => {
		const needle = props.search().toLowerCase().trim();
		return Object.values(tabs)
			.filter((t) => {
				if (t.windowId !== props.id) return false;
				if (!needle) return true;
				return (
					t.title?.toLowerCase().includes(needle) || t.url.includes(needle)
				);
			})
			.sort((a, b) => a.index - b.index);
	});

	const loadedTabs = createMemo(() => {
		return myTabs().filter((tab) => !tab.discarded);
	});

	const handleLoaded = async (event: MouseEvent) => {
		event.stopPropagation();
		await Promise.all(loadedTabs().map((tab) => browser.tabs.discard(tab.id)));
	};

	const handleClose = async (event: MouseEvent, id: number) => {
		event.stopPropagation();
		await browser.windows.remove(id);
	};

	return (
		<div
			class="window-group"
			classList={{ "window-drop-target": isDropTarget() }}
		>
			<div class="window-header">
				<div>
					Window {props.id}
					<span class="window-count">[{myTabs().length}]</span>
				</div>
				<div class="window__actions">
					<Show when={loadedTabs().length > 1}>
						<button
							type="button"
							class="tab__btn tab__btn--loaded"
							onclick={(event) => handleLoaded(event)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<title>Tab loaded</title>
								<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
							</svg>
						</button>
					</Show>
					<button
						type="button"
						class="tab__btn tab__btn--close"
						onclick={(event) => handleClose(event, props.id)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<title>Close tab</title>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</button>
				</div>
			</div>
			<ul class="tabs" ref={ref}>
				<For each={myTabs()}>
					{(tab, i) => <TabItem tab={tab} index={i()} windowId={props.id} />}
				</For>
			</ul>
		</div>
	);
}
