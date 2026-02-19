# js-chess-engine Browser Demo

A browser-based demo app for [js-chess-engine](https://github.com/nicfab/js-chess-engine) — play chess against AI entirely in your browser with no server required. Everything, including the AI, runs client-side in JavaScript.

**Live demo:** [chess-fe.josefjadrny.info](http://chess-fe.josefjadrny.info/)

## Features

- **Human vs AI** — play as White against the AI (Black)
- **Predefined AI levels (1–5)** — quick difficulty selection from beginner to advanced
- **Custom AI configuration** — fine-tune the engine parameters:
  - Search depth
  - Extended search depth
  - Quiescence search depth
  - Check extension toggle
  - Transposition table (TT) memory size (MB)
- **Move highlighting** — valid moves and last move are visually indicated on the board
- **Check and checkmate detection** — game state is displayed in real time
- **Runs entirely in the browser** — no backend, no API calls; the js-chess-engine AI computes moves directly in the browser tab

> **Note:** When using custom configuration with high depth values, the AI computation runs on the main thread and may freeze or crash the browser tab.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Built with React + Vite.
