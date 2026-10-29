# RepoOrbit

RepoOrbit turns a public GitHub repository's history into a top-down pixel art space station. Commits build modules, branches add antennas, pull requests add links, bug-labeled issues become alerts, contributors join the crew, and releases open new sections.

## Run locally

```sh
npm install
npm run dev
```

The landing page offers a fictional sample station. Enter a public repository as `owner/repo` or paste its GitHub URL to load live data.

## Commands

```sh
npm test
npm run build
npm run preview
```

## Data notes

- GitHub data is read directly from its public REST API. RepoOrbit does not ask for a token, write to GitHub, or send repository data to a backend.
- Each event category starts with one page. Use **Load earlier history** to request older pages; requests are made sequentially and the UI reports partial history and rate limits.
- Each module covers 20 loaded commits. The station displays up to eight modules and adds up to four solar arrays as the loaded history grows; the exact commit count remains visible. Loading older pages can regroup commits because the earliest loaded commit changes.
- The unauthenticated GitHub API quota is shared by originating IP address. A quota or network error leaves the clearly labeled sample available.
- GitHub exposes current branch refs, not a complete history of branch creation or deletion. Branch dates are therefore estimated from observed commits when possible.
- Alerts represent open issues with a `bug` label. Public issue records do not guarantee a complete timeline of every status change.
- Crew arrival dates are inferred from the first commit in the loaded history; contributors without a known first commit are placed at the latest loaded commit.
- Module types are symbolic and do not describe the actual files.
- The sample dataset is fictional and is never mixed into repository data.

## Stack

Vite, React, TypeScript, PixiJS 8, and Vitest. Typography is bundled locally through Fontsource packages.

## Project structure

- `src/domain`: repository events, timeline calculations, and deterministic station growth. These functions are independent of React and GitHub's response format.
- `src/data/github`: public GitHub client, response types, pagination, and conversion into domain events. `src/data/sample` holds the explicitly fictional dataset.
- `src/features/explorer`: the explorer's state and React screens, inspector, and timeline controls.
- `src/features/station`: the Pixi canvas lifecycle, scene composition, sprites, and landing preview.
- `src/shared`: interface primitives and event formatting; `src/styles` contains the styles in cascade order. `src/app` connects the features at the application entry point.

Data flows from GitHub or the sample through normalization into the domain. The explorer derives the selected state and passes it to the station renderer; Pixi selection is sent back to the explorer as an event ID.
