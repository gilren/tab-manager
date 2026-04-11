export interface SearchBarConfig {
	initialValue: string;
	onSearch: (value: string) => void;
	clearButton?: HTMLButtonElement;
}

export function setupSearchBar(
	element: HTMLInputElement,
	config: SearchBarConfig,
) {
	const { initialValue, onSearch, clearButton } = config;

	element.value = initialValue;

	const clear = () => {
		element.value = "";
		onSearch("");
	};

	const handleInput = () => {
		onSearch(element.value);
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			clear();
		}
	};

	if (clearButton) {
		clearButton.addEventListener("click", clear);
	}

	element.addEventListener("input", handleInput);
	element.addEventListener("keydown", handleKeydown);
}
