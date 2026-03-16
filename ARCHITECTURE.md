# Dora Architecture

## Shape

- Dora is a desktop shell, not the core system itself.
- The app talks to a compatible chat backend for chat.
- The app talks to a bundled sidecar for local worker tasks.
- A core backend is optional and can be added later.

## Pieces

- Chat UI:
  - Main window, chatbar, navigator
  - Uses the same frontend surfaces in ephemeral or persistent modes
- Sidecar:
  - Python process
  - Spawned by Tauri
  - JSON over stdin/stdout
  - Handles search, browse, extract, render
- Compatible server:
  - User-configured chat backend
  - OpenAI-compatible shape is the target seam
- Core:
  - Optional second backend for persistence, validation, and richer retrieval

## Modes

- Ephemeral mode:
  - No core
  - Search and browse still work
  - Navigator shows live results
- Persistent mode:
  - Core configured
  - Same UI surface
  - Richer storage and retrieval behind it

## Rule

- The core makes Dora better.
- The core does not make Dora possible.
