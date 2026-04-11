export interface StatsConfig {
	count: number;
}

export function setupStats(element: HTMLElement, config: StatsConfig) {
	element.textContent = `${config.count} tabs`;
}
