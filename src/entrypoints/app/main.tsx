import "solid-devtools";
import { render } from "solid-js/web";
import "@solid-devtools/debugger/setup";

import "./style.css";
import App from "./App";

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element not found");
}

render(() => <App />, root);
