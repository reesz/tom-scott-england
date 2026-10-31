# England — A Tom Scott Series

An interactive antique-style map of England's ceremonial counties, linking each one to Tom Scott's video series exploring the country county by county.

**Live site:** [reesz.github.io/tom-scott-england](https://reesz.github.io/tom-scott-england/)

## Features

- 3D rendered map of England with labelled counties
- Click a county to view its details, landmarks, and video links (YouTube & Nebula)
- Mobile-friendly with pinch-to-zoom, bottom sheet UI, and touch-optimised controls
- Light and dark theme support

## Tech Stack

React 19, TanStack Router, Three.js, D3-geo, Tailwind CSS, Vite

## Getting Started

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
```

## Contributing County Data

All county data lives in [`public/data/counties.json`](public/data/counties.json). Each county is an object in the `counties` array:

```jsonc
{
  "id": "rutland",                // kebab-case, unique
  "name": "Rutland",
  "population": 41043,
  "areaSqKm": 382,
  "countyTown": {
    "name": "Oakham",
    "coords": { "lat": 52.6703, "lng": -0.7290 }
  },
  "description": "England's smallest ceremonial county...",
  "coatOfArms": "/assets/arms/rutland.svg",
  "landmarks": [
    { "name": "Rutland Water", "coords": { "lat": 52.658, "lng": -0.720 } }
  ],
  "youtubeId": "zKx1VJsLsfk",    // YouTube video ID only, not the full URL
  "nebulaUrl": "https://nebula.tv/videos/tomscott-...",
  "status": "released",           // "released" or "upcoming"
  "releaseDate": "2026-03-30"     // YYYY-MM-DD
}
```

### How to Add or Update a County

1. Fork this repo and create a branch
2. Edit `public/data/counties.json`
3. To **add video links** for a newly released county, fill in `youtubeId` (just the ID, e.g. `dQw4w9WgXcQ`) and `nebulaUrl` (full URL), and set `status` to `"released"`
4. To **update info** (description, landmarks, population, etc.), edit the relevant fields
5. For **upcoming** counties, set `youtubeId` and `nebulaUrl` to `null` and `status` to `"upcoming"`
6. If a county gets **more than one episode** (e.g. Tom's historic counties Westmorland and Cumberland both map to Cumbria), keep the first in the top-level fields and list the rest in an optional `additionalVideos` array of `{ "title", "youtubeId", "nebulaUrl", "releaseDate" }` objects
7. Open a pull request with a brief description of your changes

### Guidelines

- Use accurate coordinates (decimal degrees) for county towns and landmarks
- Keep descriptions concise (1-2 sentences)
- Include at least one landmark per county
- Coat of arms SVGs go in `public/assets/arms/`

### Tom's Journey

The route button (bottom right) steps through the series in filming order, using [`public/data/journey.json`](public/data/journey.json). Its stops were extracted from the route drawn on [tomscott.com/england](https://www.tomscott.com/england/) and georeferenced, so coordinates are approximate. When a new episode comes out, append a stop:

```jsonc
{
  "episode": 33,
  "historicCounty": "Wiltshire",  // the county as Tom names it
  "countyId": "wiltshire",        // the ceremonial county in counties.json it is filed under
  "title": "…",                    // video title, or null while upcoming
  "place": "…",                    // filming location, or null if not named
  "coords": { "lat": 51.16, "lng": -1.85 },
  "travel": "car",                // "car" or "train": how Tom got there from the previous stop
  "upcoming": true                // optional; drawn as a dotted final leg
}
```

## License

This is a community fan project. Tom Scott's video content belongs to him and his production team.
