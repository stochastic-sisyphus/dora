# Dora Architecture Overview

## Core Philosophy

Open composition through decoupled plugs that connect via a shared ledger.
Views and entry points don't know about each other - they only know the ledger protocol.

---

## Components

### 1. Sidecar (Universal Client)

**Location:** `src/lib/sidecar/`

**Purpose:** Universal client for search, extraction, browsing, and rendering.
Works standalone (ephemeral) or with any ledger backend (persistent).

**Capabilities:**
- `universalSearch(query, config)` - Any search API
- `universalExtract(content, config)` - Any OpenAI/Anthropic-compatible LLM
- `browseUrl(url)` - Web browsing
- `renderContent(content, type)` - Artifact rendering

**Configuration:**
```typescript
interface SidecarConfig {
    searchEndpoint?: { url, method, headers, bodyTemplate, responsePath };
    llmEndpoint?: { url, apiKey, model, provider, systemPrompt };
    ledger?: { type, connection, adapterConfig, auth };
    webhook?: { url, events, headers };
}
```

**Defaults when unconfigured:**
- Search: `https://searx.be` (public SearXNG)
- LLM: None (returns null gracefully)
- Ledger: None (ephemeral mode)
- Webhook: None

---

### 2. Chat UI (Compatible Server)

**Location:** `src/lib/apis/`, `src/lib/components/chat/`

**Purpose:** Connect to any OpenAI-compatible chat backend.

**Configuration:**
```typescript
interface ChatConfig {
    baseUrl: string;  // Any OpenAI-compatible server
    apiKey?: string;
    model?: string;
}
```

**Works with:**
- Open WebUI
- LibreChat
- LobeChat
- Ollama
- vLLM
- Any OpenAI-compatible API

---

### 3. Ledger (Optional Persistence)

**Purpose:** Append-only store for findings, judgments, observations, artifacts.

**Protocol (LedgerAdapter interface):**
```typescript
interface LedgerAdapter {
    connect(config: LedgerConfig): Promise<void>;
    append(entry: LedgerEntry): Promise<string>;  // Returns entry ID
    query(region: RegionQuery): Promise<LedgerEntry[]>;
    close(): Promise<void>;
}
```

**Entry Types:**
- `finding` - Research findings with claims, consensus, contradictions
- `judgment` - Typed decisions/annotations
- `observation` - Raw observations
- `artifact` - Rendered content, files, etc.

**LedgerConfig:**
```typescript
interface LedgerConfig {
    type: string;        // 'sqlite', 'postgres', 'custom-adapter', etc.
    connection: string;  // file://, postgresql://, https://, grpc://
    adapterConfig?: Record<string, any>;
    auth?: { type, token, username, password, apiKey, headers };
}
```

**Backend implementations needed:**
1. SQLite adapter (local, file-based)
2. PostgreSQL adapter (shared, multi-user)
3. HTTP adapter (REST API backends)
4. gRPC adapter (gRPC backends)
5. Custom adapter interface for third-party implementations

---

### 4. Plug Interface

**View Plugs:**
```typescript
interface ViewPlug {
    regionQuery: RegionQuery;  // What data I want
    render: (results: any) => HTMLElement;  // How I render it
}
```

**Entry Plugs:**
```typescript
interface EntryPlug {
    judgmentType: string;  // What I produce
    capture: () => Judgment;  // How I capture it
    submit: (judgment: Judgment) => void;  // Send to ledger
}
```

**Region Query:**
```typescript
interface RegionQuery {
    type: string;
    predicates: Record<string, any>;
    temporalRange?: { from?, to? };
    calibration?: Record<string, any>;
}
```

---

### 5. Core Process (To Be Built)

**Purpose:** Owns the ledger, executes region queries, validates entries.

**Responsibilities:**
- Run anywhere (local, VPS, cloud)
- Expose protocol (stdin/stdout, HTTP, WebSocket)
- Doesn't know about views or entry points
- Validates entries at chokepoint

**Protocol (what goes in/out):**
- In: Typed entries (LedgerEntry)
- Out: Region query results, change events

---

### 6. Orchestrator (Optional)

**Purpose:** Workflow orchestration, durable execution.

**Examples:**
- Temporal (uses PostgreSQL)
- Custom workflow engine
- Not required for basic operation

**Activities:**
- Retrieval
- Extraction
- Reconciliation
- Research sessions (survive crashes)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         LEDGER                               │
│  (SQLite / PostgreSQL / Custom Backend)                      │
│                                                              │
│  Entries: finding, judgment, observation, artifact          │
│  ────────────────────────────────────────────────────────   │
│  connect() | append() | query() | close()                   │
└─────────────────────────────────────────────────────────────┘
         ▲                                              ▲
         │                                              │
    ┌────┴────┐                                  ┌──────┴──────┐
    │ SIDECAR │                                  │  CHAT UI    │
    │         │                                  │             │
    │ Search  │                                  │ Compatible  │
    │ Extract │                                  │ Server      │
    │ Browse  │                                  │ (any LLM)   │
    │ Render  │                                  │             │
    │         │                                  │             │
    │ Config: │                                  │ Config:     │
    │ - Any   │                                  │ - Any       │
    │   search│                                  │   OpenAI-   │
    │ - Any   │                                  │   compatible│
    │   LLM   │                                  │             │
    │ - Any   │                                  │             │
    │   ledger│                                  │             │
    └─────────┘                                  └─────────────┘
```

---

## What Needs To Be Built

### Backend (Core Process)

1. **Ledger Storage Layer**
   - SQLite adapter (priority: high)
   - PostgreSQL adapter (priority: high)
   - HTTP adapter (priority: medium)
   - gRPC adapter (priority: low)

2. **Core Process**
   - Region query executor
   - Entry validation at chokepoint
   - Change event emission
   - Protocol exposure (stdin/stdout, HTTP, WebSocket)

3. **Orchestrator Integration** (optional)
   - Temporal workflows
   - Activity workers
   - Session persistence

### Frontend (Already Built)

1. **Sidecar Client** - Done
2. **Chat UI** - Done (renamed to Compatible Server)
3. **Settings UI** - Done (Sidecar.svelte component)
4. **Type Definitions** - Done

---

## Configuration Storage

**Location:** `$appConfig` (cross-window writable store)

**Structure:**
```typescript
interface AppConfig {
    // Sidecar configuration
    sidecar: SidecarConfig;
    
    // Chat UI configuration
    compatibleServer: {
        baseUrl: string;
        apiKey?: string;
        model?: string;
    };
    
    // Other app settings...
}
```

**Persistence:** Tauri store plugin (file-based)

---

## Key Design Decisions

1. **No hardcoded providers** - Everything configurable
2. **Works without ledger** - Graceful degradation
3. **Independent configs** - Sidecar and Chat UI can use different backends
4. **Protocol over implementation** - LedgerAdapter interface is the contract
5. **Felt coupling without code coupling** - Components connect through ledger, not each other

---

## File Structure

```
dora/
├── src/
│   ├── lib/
│   │   ├── sidecar/           # Universal sidecar client
│   │   │   ├── types.ts       # Type definitions
│   │   │   ├── index.ts       # Client implementation
│   │   │   ├── config.ts      # Config store
│   │   │   └── index.browser.ts
│   │   ├── apis/              # Chat UI APIs
│   │   ├── components/chat/   # Chat UI components
│   │   │   └── Settings/
│   │   │       └── Sidecar.svelte
│   │   └── stores/            # App configuration stores
│   └── app/
├── sidecar/                   # Future Python sidecar directory
│   └── README.md
├── src-tauri/                 # Tauri backend
│   ├── src/
│   │   └── lib.rs            # Tauri commands (sidecar.rs removed)
│   └── tauri.conf.json
└── ARCHITECTURE.md           # This file
```

---

## Next Steps

1. **Implement SQLite ledger adapter** - Start simple, local-first
2. **Build core process** - Rust or Python, exposes ledger protocol
3. **Add Tauri sidecar** - Python process via stdin/stdout IPC
4. **Implement View Plug examples** - Research panel, notes panel
5. **Implement Entry Plug examples** - Triage, anchor, dismiss judgments
