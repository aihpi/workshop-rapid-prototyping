# HPI Studio

Full-stack DAW: Vite + React + TypeScript in `01_frontend/`, Fastify + Drizzle in
`02_backend/`, the zod song schema in `packages/shared/`. npm workspaces, Node 22.
The workshop material it sits next to lives in `03_workshop/`.

## Commands

```bash
npm ci                  # install everything
npm run typecheck       # all workspaces
npm test                # all workspaces
npm run e2e             # Playwright against the Vite dev server, no API needed
npm run dev:api         # Fastify on :3000, needs `docker compose up db`
npm run dev:web         # Vite on :5173, proxies /api to :3000
docker compose up --build   # the whole thing on :8080
```

Run typecheck and tests before declaring a step done, and show the output.

## Rules that are easy to break

- **Tone.js 15**: `Tone.getTransport()`, `Tone.getDestination()`, `Tone.getContext()`.
  The static `Tone.Transport` form is deprecated and older snippets use it everywhere.
- The audio graph is built by the pure factory `buildGraph(song, ctx)` and nowhere else,
  because `Tone.Offline` renders into a fresh context and cannot reuse live nodes.
- Tone objects are never created inside React components or effects. The engine is a
  module singleton subscribed to the store at module scope in `main.tsx`.
- Two stores. `useSongStore` is the document: undoable, persisted, reconciled into audio.
  `useUiStore` is selection, zoom, scroll, playhead, drag state: none of those things.
  Transient state never goes in the document.
- Every user-visible edit is exactly one `produce()` call, so its inverse patches form one
  undo step. Continuous gestures wrap in `history.begin()` / `history.commit()`.
- The UI store holds `editingClipId`, never a pattern id. Patterns are derived.
- The playhead is written to the DOM from a rAF loop. It never enters React state.
- Colours come from `01_frontend/src/styles/hpi.css`. No hex literals anywhere else.
  At most one HPI secondary colour on screen; track colours are primary gradations.
- Drag and resize touch the store once, on pointerup.
- Gesture code receives the element to capture on explicitly. A React event's
  `nativeEvent.currentTarget` is the root container, not the element.
- Behaviour that a unit test cannot reach (pointer capture, double-click, downloads) is
  checked by driving headless Chrome through the DevTools protocol or Playwright.

## Style

British English in prose and comments. No em-dashes. Match the surrounding code's
comment density; explain the why, not the what.
