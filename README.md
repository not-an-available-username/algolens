# AlgoLens

An interactive computer-science workstation for exploring algorithms and data structures through execution visualizations.

## Current implementation

- Retro terminal-inspired interface with a phosphor-green palette.
- Full-viewport Matrix-style canvas background (pauses when the document is hidden and respects reduced-motion).
- Interactive Three.js point-cloud retro computer with mouse/touch rotation and ASCII ALGOLENS artwork on its screen.
- Sorting visualizers: Bubble Sort, Selection Sort, Insertion Sort, and Merge Sort.
- Step-by-step execution, play/pause, previous/next, reset, speed control, custom arrays, randomization, synchronized pseudocode, and complexity metadata.
- Responsive desktop, tablet, and mobile layouts.

## Stack

React, TypeScript, Vite, Three.js, Lucide React.

## Requirements

Node.js 20 or newer and npm.

## Install and run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The Vite base path is configured as `/algolens/` for GitHub Pages deployment.

## Roadmap

The architecture separates algorithm step generation from presentation. Searching, graph algorithms, dynamic programming, and data-structure modules can be added under `src/algorithms` and integrated into the shared workstation shell.

## Deployment

Build with `npm run build` and publish the generated `dist/` directory. Configure the repository's GitHub Pages workflow to deploy that directory. The app uses the `/algolens/` Vite base path.
