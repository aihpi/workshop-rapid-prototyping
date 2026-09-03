import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { engine, reconcile } from "./audio/index.ts";
import { scratchSong } from "./demo/scratchSong.ts";
import { useSongStore, wireStores } from "./state/index.ts";
import "./styles/hpi.css";

// Wired once, at module scope, never inside a component: StrictMode double-runs
// effects and would build the audio graph twice.
useSongStore.getState().load(scratchSong());
wireStores();
useSongStore.subscribe(
  (s) => s.doc,
  (next, prev) => reconcile(prev, next, engine),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
