# Dora

Desktop shell for chat, search, and browsing.

## What It Is

- Tauri desktop app with three windows: main, chatbar, navigator
- Works against a compatible chat server you point it at
- Bundled Python sidecar handles local search, fetch, render, and extraction work
- No core required for basic use

## Current Shape

- Main window: full chat surface
- Chatbar: quick entry point
- Navigator: view over ephemeral research results now, richer data source later
- Sidecar: spawned by Tauri, stdin/stdout JSON protocol, bundled in `src-tauri/binaries/`

## Development

- Requirements:
  - Rust stable
  - Python 3.11+
  - Node 18.13 through 24.x
  - `corepack` / `pnpm`
- Install:
  - `corepack enable pnpm`
  - `corepack pnpm install`
- Run:
  - `corepack pnpm tauri dev`

## Notes

- The dev flow builds the sidecar before launching Tauri.
- Chat works without a core.
- A configured core is an upgrade path, not a prerequisite.
