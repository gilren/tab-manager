import type { Accessor, Setter } from "solid-js";

interface HeaderProps {
	search: Accessor<string>;
	setSearch: Setter<string>;
	tabCount: Accessor<number>;
	duplicates: Accessor<Set<number>>;
}

export default function Header({
	search,
	setSearch,
	tabCount,
	duplicates,
}: HeaderProps) {
	const duplicateCount = () => duplicates().size;

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

	const handleDuplicatesClose = async (event: MouseEvent) => {
		event.preventDefault();
		await browser.tabs.remove(Array.from(duplicates()));
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
					<span class="shortcut">[↑↓]</span>
					<span class="shortcut">[ENTER]</span>
					<span class="shortcut">[DEL]</span>
					<button
						type="button"
						class="dup-btn"
						disabled={duplicateCount() === 0}
						title="Remove duplicate tabs"
						onClick={handleDuplicatesClose}
					>
						[REMOVE DUPLICATES
						{duplicateCount() > 0 && ` (${duplicateCount()})`}]
					</button>
				</div>
			</div>
		</header>
	);
}
