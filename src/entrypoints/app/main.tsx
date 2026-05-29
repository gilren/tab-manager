import "solid-devtools";
import { render } from "solid-js/web";
import "@solid-devtools/debugger/setup";

import "./style.css";
import App from "./App";

render(() => <App />, document.getElementById("root")!);
