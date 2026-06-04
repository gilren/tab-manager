import type { Accessor, Setter } from "solid-js";
import { useTabsContext } from "@/store/tabs";

interface HeaderProps {
	search: Accessor<string>;
	setSearch: Setter<string>;
}

export default function Header({ search, setSearch }: HeaderProps) {
	const { tabs, tabsByWindow } = useTabsContext();

	const tabCount = createMemo(() => {
		const needle = search().toLowerCase().trim();
		if (!needle) return Object.keys(tabs).length;
		return Object.values(tabs).filter(
			(t) => t.title?.toLowerCase().includes(needle) || t.url.includes(needle),
		).length;
	});

	const matchingIds = createMemo(() => {
		const needle = search().toLowerCase().trim();
		if (!needle) return [];
		return Object.values(tabs)
			.filter(
				(t) =>
					t.title?.toLowerCase().includes(needle) || t.url.includes(needle),
			)
			.map((t) => t.id);
	});

	const loadedIds = createMemo(() =>
		Object.values(tabs)
			.filter((t) => !t.discarded)
			.map((t) => t.id),
	);

	const duplicatesIds = createMemo(() =>
		Object.values(tabs)
			.filter((t) => t.isDuplicate)
			.map((t) => t.id),
	);

	const aiTabIds = createMemo(() =>
		Object.values(tabs)
			.filter((t) => t.isAI)
			.map((t) => t.id),
	);

	const windowCount = () => Object.values(tabsByWindow).length;
	const duplicateCount = () => duplicatesIds().length;
	const loadedCount = () => loadedIds().length - windowCount();
	const aiCount = () => aiTabIds().length;

	const handleSearch = (
		event: InputEvent & { currentTarget: HTMLInputElement },
	) => {
		setSearch(event.currentTarget.value);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			setSearch("");
		}
	};

	const handleClick = (event: MouseEvent) => {
		event.preventDefault();
		setSearch("");
	};

	const handleLoadedUnload = async (event: MouseEvent) => {
		event.preventDefault();
		const discardedTabs = Promise.all(
			loadedIds().map((id) => browser.tabs.discard(id)),
		);
		await discardedTabs;
	};

	const handleDuplicatesClose = async (event: MouseEvent) => {
		event.preventDefault();
		await browser.tabs.remove(duplicatesIds());
	};

	const handleAiClose = async (event: MouseEvent) => {
		event.preventDefault();
		await browser.tabs.remove(aiTabIds());
	};

	const handleRemoveMatching = async (event: MouseEvent) => {
		event.preventDefault();
		await browser.tabs.remove(matchingIds());
		setSearch("");
	};

	return (
		<header class="header">
			<div class="search-wrapper">
				<input
					class="search"
					type="search"
					id="search"
					placeholder="Search tabs..."
					autofocus
					onKeyDown={handleKeyDown}
					onInput={handleSearch}
					value={search()}
				/>
				<button
					type="button"
					class="clear-btn"
					id="clear-btn"
					onClick={handleClick}
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
			</div>
			<div class="header-actions">
				<div class="stats" id="stats">
					{tabCount()} tabs
				</div>
				<div class="actions">
					<Show when={!search()}>
						<button
							type="button"
							class="btn btn-loaded"
							disabled={loadedCount() === 0}
							title="Remove loaded tabs"
							onClick={handleLoadedUnload}
						>
							[REMOVE LOADED
							{loadedCount() > 0 && ` (${loadedCount()})`}]
						</button>
						<button
							type="button"
							class="btn btn-duplicated"
							disabled={duplicateCount() === 0}
							title="Remove duplicate tabs"
							onClick={handleDuplicatesClose}
						>
							[REMOVE DUPLICATES
							{duplicateCount() > 0 && ` (${duplicateCount()})`}]
						</button>
						<button
							type="button"
							class="btn btn-ai"
							disabled={aiCount() === 0}
							title="Remove AI tabs"
							onClick={handleAiClose}
						>
							[REMOVE AI{aiCount() > 0 && ` (${aiCount()})`}]
						</button>
					</Show>
					<Show when={search()}>
						<button
							type="button"
							class="btn btn-matching"
							disabled={matchingIds().length === 0}
							title="Remove all matching tabs"
							onClick={handleRemoveMatching}
						>
							[REMOVE ALL MATCHING ({matchingIds().length})]
						</button>
					</Show>
				</div>
			</div>
		</header>
	);
}
