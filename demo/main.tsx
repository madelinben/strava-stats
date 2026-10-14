import { createRoot } from "react-dom/client";
import { StravaApp } from "../src";
import "./demo.css";

// No sticker maker next to the demo: the button is hidden by the host app only; here it just stores the handoff.
createRoot(document.getElementById("root") as HTMLElement).render(<StravaApp />);
