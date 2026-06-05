import type { Accessor, JSXElement, Setter } from "solid-js";

interface QuickFilterProps {
	domain: string;
	label: string;
	search: Accessor<string>;
	setSearch: Setter<string>;
	children: JSXElement;
}

export default function QuickFilter(props: QuickFilterProps) {
	const isActive = () => props.search() === props.domain;

	const handleClick = () => {
		props.setSearch(isActive() ? "" : props.domain);
	};

	return (
		<button
			type="button"
			class="quick-filter"
			classList={{ active: isActive() }}
			title={`Filter ${props.label} tabs`}
			onClick={handleClick}
		>
			{props.children}
		</button>
	);
}
