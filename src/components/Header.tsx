import type { Accessor, Setter } from "solid-js";
import QuickFilter from "@/components/QuickFilter";
import { useTabsContext } from "@/store/tabs";
import { isTabDiscardable } from "@/utils/helper";

interface HeaderProps {
	search: Accessor<string>;
	setSearch: Setter<string>;
}

export default function Header({ search, setSearch }: HeaderProps) {
	const { tabs } = useTabsContext();

	const normalizedSearch = createMemo(() => search().toLowerCase().trim());

	const matchingTabs = createMemo(() => {
		const needle = normalizedSearch();
		const allTabs = Object.values(tabs);
		if (!needle) return allTabs;

		return allTabs.filter(
			(t) =>
				t.title?.toLowerCase().includes(needle) ||
				t.url.toLowerCase().includes(needle),
		);
	});

	const tabCount = () => matchingTabs().length;
	const matchingIds = createMemo(() => {
		if (!normalizedSearch()) return [];
		return matchingTabs().map((t) => t.id);
	});

	const loadedIds = createMemo(() =>
		Object.values(tabs)
			.filter(isTabDiscardable)
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

	const duplicateCount = () => duplicatesIds().length;
	const loadedCount = () => loadedIds().length;
	const aiCount = () => aiTabIds().length;

	const handleSearchInput = (
		event: InputEvent & { currentTarget: HTMLInputElement },
	) => {
		setSearch(event.currentTarget.value);
	};

	const handleSearchKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			setSearch("");
		}
	};

	const handleClearSearch = (event: MouseEvent) => {
		event.preventDefault();
		setSearch("");
	};

	const handleDiscardLoadedTabs = async (event: MouseEvent) => {
		event.preventDefault();
		await Promise.all(loadedIds().map((id) => browser.tabs.discard(id)));
	};

	const handleRemoveDuplicateTabs = async (event: MouseEvent) => {
		event.preventDefault();
		await browser.tabs.remove(duplicatesIds());
	};

	const handleRemoveAiTabs = async (event: MouseEvent) => {
		event.preventDefault();
		await browser.tabs.remove(aiTabIds());
	};

	const handleRemoveMatchingTabs = async (event: MouseEvent) => {
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
					onKeyDown={handleSearchKeyDown}
					onInput={handleSearchInput}
					value={search()}
				/>
				<button
					type="button"
					class="clear-btn"
					id="clear-btn"
					onClick={handleClearSearch}
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
				<div class="quick-filters">
					<QuickFilter
						domain="google.com/search"
						label="Google"
						search={search}
						setSearch={setSearch}
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
							<title>Google</title>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
						</svg>
					</QuickFilter>
					<QuickFilter
						domain="github.com"
						label="GitHub"
						search={search}
						setSearch={setSearch}
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
							<title>GitHub</title>
							<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
						</svg>
					</QuickFilter>
					<QuickFilter
						domain="youtube.com"
						label="YouTube"
						search={search}
						setSearch={setSearch}
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
							<title>YouTube</title>
							<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
							<path d="m10 15 5-3-5-3z" />
						</svg>
					</QuickFilter>
				</div>
				<div class="actions">
					<div class="stats" id="stats">
						{tabCount()} tabs
					</div>
					<Show when={!search()}>
						<button
							type="button"
							class="btn btn-loaded"
							disabled={loadedCount() === 0}
							title="Remove loaded tabs"
							onClick={handleDiscardLoadedTabs}
						>
							[REMOVE LOADED
							{loadedCount() > 0 && ` (${loadedCount()})`}]
						</button>
						<button
							type="button"
							class="btn btn-duplicated"
							disabled={duplicateCount() === 0}
							title="Remove duplicate tabs"
							onClick={handleRemoveDuplicateTabs}
						>
							[REMOVE DUPLICATES
							{duplicateCount() > 0 && ` (${duplicateCount()})`}]
						</button>
						<button
							type="button"
							class="btn btn-ai"
							disabled={aiCount() === 0}
							title="Remove AI tabs"
							onClick={handleRemoveAiTabs}
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
							onClick={handleRemoveMatchingTabs}
						>
							[REMOVE ALL MATCHING ({matchingIds().length})]
						</button>
					</Show>
				</div>
			</div>
		</header>
	);
}
