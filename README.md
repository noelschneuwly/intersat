# intersat

A map-first prototype for exploring Swiss landscapes through swisstopo imagery. The map is the main canvas, with a compact location search, familiar map controls, points of interest, and a floating chat panel.

## What’s here

- **Swiss imagery:** SwissIMAGE aerial tiles and a colored map layer from swisstopo.
- **Map exploration:** pan and zoom, view the scale, switch map styles, or return to Lauterbrunnen.
- **Location search:** choose from a small preset list of Swiss destinations.
- **Points of interest:** sample markers around Lauterbrunnen, including Staubbachfall and Trümmelbachfälle.
- **Fieldnotes chat:** suggested prompts and local sample answers about the Lauterbrunnen landscape.
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

Search destinations, point-of-interest markers, and chat responses are currently hard-coded demonstration data in `src/App.tsx`. The chat uses simple local keyword matching: it does not analyze imagery, retrieve live information, or call an AI service. Detailed sample answers currently cover Lauterbrunnen; other locations show a notice explaining this limitation.

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
