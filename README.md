# intersat

A map-first prototype for exploring Swiss landscapes through swisstopo imagery. The map is the main canvas, with a compact location search, familiar map controls, points of interest, and a floating chat panel.

## What’s here

- **Swiss imagery:** SwissIMAGE aerial tiles and a colored map layer from swisstopo.
- **Map exploration:** pan and zoom, view the scale, switch map styles, or return to Zurich Airport.
- **Location search:** choose from a small preset list of Swiss destinations.
- **Points of interest:** sample markers around Zurich Airport, plus user-added pins placed directly on the map.
- **Fieldnotes chat:** local sample answers, or connect an OpenAI-compatible chatbot from the header.
- **Image frame selection:** drag over the map to select swisstopo tiles and inspect the frame bounds and tile coverage.
- **Responsive layout:** map-first desktop view and a compact mobile interface.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Project commands

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start the development server                         |
| `npm run build`   | Type-check and build the production app into `dist/` |
| `npm run preview` | Preview the production build locally                 |
| `npm run lint`    | Run Oxlint                                           |

## Data and current limitations

Map tiles load directly from the [swisstopo WMTS service](https://wmts.geo.admin.ch/), so an internet connection is required. The aerial layer uses `ch.swisstopo.swissimage`; the alternate colored map layer uses `ch.swisstopo.pixelkarte-farbe`. Map attribution is displayed on the map.

Search destinations and points of interest are demonstration data in `src/App.tsx`. Select **Place a pin** on the map toolbar, then click the map; select a pin to remove it. Pins are temporary and reset when the page reloads.

Select **Add chatbot** to configure an OpenAI-compatible chat API base URL, chat model, and optional API key. Chat requests are sent directly from the browser to the configured provider, so its CORS policy must allow the app. Configuration and API credentials stay in browser memory for the current session and are not saved. Do not use this direct-browser setup to distribute a private API key in a public deployment; use a backend proxy for production. Without a configured chatbot, Fieldnotes uses local sample answers.

Image embeddings must be generated from the selected aerial map tiles, not text descriptions. The current UI supports selecting a frame and viewing its geographic bounds and tile coverage. Image-embedding generation, vector storage, and retrieval are not implemented yet: they require a multimodal image-embedding service and a backend to store vectors alongside tile coordinates for later location search and analysis. The UI leaves generation disabled until those services are connected; the text-only `/embeddings` endpoint is not used.

## Stack

React · TypeScript · Vite · Leaflet · React-Leaflet · Lucide

## Repository layout

```text
src/
  App.tsx     Map, sample data, search, and chat behavior
  map.css     Map-first and responsive interface styles
  main.tsx    React application entry point
index.html    Page metadata and application mount point
```
