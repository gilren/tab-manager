import type { Tab } from "@/types";

interface TabItemProps {
	tab: Tab;
	isDuplicate: boolean;
}

// 	el.addEventListener("click", () => onActivate(tab.id, windowId));

// isFocused && "focused",

export default function TabItem({ tab, isDuplicate }: TabItemProps) {
	const handleClose = async (event: MouseEvent, id: number) => {
		event.stopPropagation();
		await browser.tabs.remove(id);
	};

	const faviconUrl = () => {
		const rawFaviconUrl = tab.favIconUrl;
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
			data-tab-id={tab.id}
			tabindex="0"
			classList={{
				"tab-duplicate": isDuplicate,
				"tab-active": tab.active,
				"tab-pinned": tab.pinned,
			}}
		>
			<img
				class="tab-favicon"
				src={faviconUrl()}
				alt={`Favicon - ${tab.title}`}
			/>
			<div class="tab-main">
				<h2 class="tab-title">{tab.title}</h2>
				<span class="tab-url">{tab.url}</span>
			</div>
			<button
				type="button"
				class="tab-close"
				onclick={(event) => handleClose(event, tab.id)}
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
					class="lucide lucide-x-icon lucide-x"
				>
					<title>Close tab</title>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</li>
	);
}
