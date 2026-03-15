# Dora Sidecar

Small Python worker process bundled with the app.

## Role

- Spawned by Tauri through the shell plugin
- Receives typed JSON on stdin
- Returns typed JSON on stdout
- Works with no core configured

## Default Behavior

- `search`: zero-config search
- `browse`: fetch a URL and return page content
- `extract`: basic extraction pipeline
- `render`: format text or notes for display
- `ping`: health check

## Optional Behavior

- Route search through a user-provided endpoint
- Route extraction through a user-provided LLM endpoint
- Forward results to a configured core later

## Build

- Source: `sidecar/dora_sidecar.py`
- Build script: `sidecar/build.py`
- Output: `src-tauri/binaries/dora-sidecar-<target>`
