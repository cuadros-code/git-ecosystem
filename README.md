# Git Ecosystem

Git Ecosystem turns a public GitHub repository's history into an isometric voxel island. Commits raise the terrain, contributors grow the forest, branches open trails, pull requests extend bridges, bug reports appear as markers, and releases raise the lighthouse.

## Run locally

```sh
npm install
npm run dev
```

The landing page offers a fictional sample island. Enter a public repository as `owner/repo` or paste its GitHub URL to grow a world from its public history. Drag to orbit the island, scroll or pinch to zoom, and use the arrow keys to rotate it with a keyboard.

## Commands

```sh
npm test
npm run build
npm run preview
```

## Data notes

- GitHub data is read directly from its public REST API. Git Ecosystem does not ask for a token, write to GitHub, or send repository data to a backend.
- Commits on the default branch continue loading page by page in the background until the full history is available. The explorer shows the loaded count, updates the island and timeline as older commits arrive, and offers a resume action if GitHub's public API quota or a connection error interrupts loading. Pull requests, issues, and releases still load one page initially; use **Load earlier history** for their older pages.
- The island follows the selected timeline date. Every commit advances the terrain; each 100 commits adds a stone-and-brass landmark, while contributors add spaced trees with varied silhouettes. Trails, bridges, bug markers, and lighthouse height represent other GitHub activity.
- The unauthenticated GitHub API quota is shared by originating IP address. A quota or network error leaves the clearly labeled sample available.
- GitHub exposes current branch refs, not a complete history of branch creation or deletion. Branch dates are therefore estimated from observed commits when possible.
- Alerts represent open issues with a `bug` label. Public issue records do not guarantee a complete timeline of every status change.
- Contributor dates are inferred from the first commit in the loaded history when GitHub does not provide an arrival date.
- Terrain features are a visual metaphor for repository activity; they do not represent source files or real geography.
- The sample dataset is fictional and is never mixed into repository data.

## Stack

Vite, React, TypeScript, Three.js, GSAP, and Vitest. Typography is bundled locally through Fontsource packages.

## Project structure

- `src/domain`: repository events and timeline calculations, independent of React and GitHub's response format.
- `src/data/github`: public GitHub client, response types, pagination, and conversion into domain events. `src/data/sample` holds the explicitly fictional dataset.
- `src/features/explorer`: the explorer's state and React screens, inspector, and timeline controls.
- `src/features/world`: the Three.js renderer, deterministic voxel island generation, orbit controls, and fictional sample world.
- `src/shared`: interface primitives and event formatting; `src/styles` contains the styles in cascade order. `src/app` connects the features at the application entry point.

Data flows from GitHub or the sample through normalization into the domain. The explorer derives the selected date and passes it to the island generator; selecting a voxel landmark sends its event ID back to the history inspector.
