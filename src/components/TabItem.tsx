import { useSortable } from "@dnd-kit/solid/sortable";
import { unwrap } from "solid-js/store";
import { useTabsContext } from "@/store/tabs";
import type { Tab } from "@/types";

interface TabItemProps {
	tab: Tab;
	index: number;
	windowId: number;
	isActive: boolean;
}

export default function TabItem(props: TabItemProps) {
	const { ref, isDragging } = useSortable({
		get id() {
			return props.tab.id;
		},
		get index() {
			return props.index;
		},
		get group() {
			return props.windowId;
		},
	});

	const handleLoaded = async (event: MouseEvent, id: number) => {
		event.stopPropagation();
		await browser.tabs.discard(id);
	};

	const handleOpen = async (
		event: MouseEvent,
		id: number,
		windowId: number,
	) => {
		event.stopPropagation();

		await browser.tabs.update(id, { active: true });
		await browser.windows.update(windowId, { focused: true });
	};

	const handleClose = async (event: MouseEvent, id: number) => {
		event.stopPropagation();
		await browser.tabs.remove(id);
	};

	const faviconUrl = () => {
		const rawFaviconUrl = props.tab.favIconUrl;
		if (!rawFaviconUrl) {
			return browser.runtime.getURL("/icons/none.svg");
		}

		if (rawFaviconUrl.startsWith("chrome://mozapps")) {
			return browser.runtime.getURL("/icons/default.svg");
		}

		return rawFaviconUrl;
	};

	return (
		<li
			class="tab"
			ref={ref}
			tabindex="0"
			classList={{
				"tab-duplicate": props.tab.isDuplicate,
				"tab-active": props.isActive,
				"tab-pinned": props.tab.pinned,
				"tab-dragging": isDragging(),
				"tab-zero": props.tab.id === 40,
			}}
		>
			<img
				class="tab-favicon"
				src={faviconUrl()}
				alt={`Favicon - ${props.tab.title}`}
			/>
			<div class="tab-main">
				<div class="tab-debug">
					{props.tab.id} - {props.index}
				</div>

				<h2 class="tab-title">{props.tab.title}</h2>
				<span class="tab-url">{props.tab.url}</span>
			</div>

			<div class="tab__indicators">
				<Show when={!props.tab.discarded}>
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
				</Show>
			</div>
			<div class="tab__actions">
				<Show when={!props.tab.discarded && !props.isActive}>
					<button
						type="button"
						class="tab__btn tab__btn--loaded"
						onclick={(event) => handleLoaded(event, props.tab.id)}
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
							<title>Tab loaded</title>
							<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
						</svg>
					</button>
				</Show>
				<button
					type="button"
					class="tab__btn tab__btn--open"
					onclick={(event) => handleOpen(event, props.tab.id, props.windowId)}
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
						<title>Open tab</title>
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
					</svg>
				</button>
				<button
					type="button"
					class="tab__btn tab__btn--close"
					onclick={(event) => handleClose(event, props.tab.id)}
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
						<title>Close tab</title>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>
		</li>
	);
}
