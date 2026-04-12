import type { Accessor } from "solid-js";
import type { Tab } from "@/types";

interface WindowProps {
	id: string;
	tabs: Tab[];
	duplicates: Accessor<Set<number>>;
}

export default function Window({ id, tabs, duplicates }: WindowProps) {
	return (
		<div class="window-group">
			<div class="window-header" data-window={id}>
				<span class="window-toggle"></span>
				Window {id}
				<span class="window-count">[{tabs.length}]</span>
			</div>
			<ul class="tabs" data-window={id}>
				<For each={tabs}>
					{(tab) => (
						<TabItem tab={tab} isDuplicate={duplicates().has(tab.id)} />
					)}
				</For>
			</ul>
		</div>
	);
}
