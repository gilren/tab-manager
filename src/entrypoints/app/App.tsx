import type { Browser } from "wxt/browser";
import Header from "@/components/Header";
import Window from "@/components/Window";
import type { Tab } from "@/types";
import { isValidTab } from "@/utils/helper";

function App() {
	const [tabs, setTabs] = createStore<Record<number, Tab>>({});
	const [search, setSearch] = createSignal("");

	const derivedTabs = createMemo(() => {
		const duplicates = new Set<number>();
		const seen = new Map<string, number>();
		const tabsByWindow: Record<number, Tab[]> = {};
		let tabCount = 0;

		for (const id in tabs) {
			const tab = tabs[id];

			if (seen.has(tab.url)) duplicates.add(tab.id);
			else seen.set(tab.url, tab.id);

			const needle = search().toLowerCase().trim();
			if (
				needle &&
				!tab.title?.toLowerCase().includes(needle) &&
				!tab.url.toLowerCase().includes(needle)
			)
				continue;
			tabCount++;
			let group = tabsByWindow[tab.windowId];
			if (!group) {
				group = tabsByWindow[tab.windowId] = [];
			}

			group.push(tab);
		}

		console.log("derived");

		return { tabCount, tabsByWindow, duplicates };
	});

	onMount(() => {
		(async () => {
			const raw = await browser.tabs.query({});
			const map = Object.fromEntries(
				raw.filter(isValidTab).map((t) => [t.id, t]),
			);
			setTabs(reconcile(map));
		})();

		const onCreated = (tab: Browser.tabs.Tab) => {
			if (isValidTab(tab)) setTabs(tab.id, tab);
		};

		const onRemoved = (tabId: number) => {
			setTabs(
				produce((s) => {
					delete s[tabId];
				}),
			);
		};

		const onUpdated = (
			_: number,
			__: Browser.tabs.OnUpdatedInfo,
			tab: Browser.tabs.Tab,
		) => {
			if (isValidTab(tab)) setTabs(tab.id, reconcile(tab));
		};

		browser.tabs.onCreated.addListener(onCreated);
		browser.tabs.onRemoved.addListener(onRemoved);
		browser.tabs.onUpdated.addListener(onUpdated);

		onCleanup(() => {
			browser.tabs.onCreated.removeListener(onCreated);
			browser.tabs.onRemoved.removeListener(onRemoved);
			browser.tabs.onUpdated.removeListener(onUpdated);
		});
	});

	return (
		<>
			<Header
				search={search}
				setSearch={setSearch}
				tabCount={() => derivedTabs().tabCount}
				duplicates={() => derivedTabs().duplicates}
			/>
			<main>
				<div id="content">
					<Suspense fallback={<p>Loading...</p>}>
						<For each={Object.entries(derivedTabs().tabsByWindow)}>
							{([id, tabs]) => (
								<Window
									id={id}
									tabs={tabs}
									duplicates={() => derivedTabs().duplicates}
								/>
							)}
						</For>
					</Suspense>
				</div>
			</main>
		</>
	);
}

export default App;
