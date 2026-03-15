# Dora Sidecar

Universal, open sidecar process. Works standalone or connected to a ledger.

## Architecture

- **No configuration required** - Browse, search, render ephemerally by default
- **Optional ledger logging** - Configure to log findings/judgments when ledger exists
- **Open adapter support** - Plug in any search/LLM/webhook endpoint
- **Independent from Chat UI** - Separate configuration, different servers allowed

## Configuration

Sidecar config lives in `$appConfig.sidecar`:

```typescript
interface SidecarConfig {
    // Optional: Search endpoint (any search API)
    searchEndpoint?: {
        url: string;
        method?: 'GET' | 'POST';
        responsePath?: string;  // JSON path to extract results
    };
    
    // Optional: LLM endpoint (any OpenAI/Anthropic-compatible API)
    llmEndpoint?: {
        url: string;
        apiKey?: string;
        model?: string;
        provider?: 'openai' | 'anthropic' | 'custom';
    };
    
    // Optional: Ledger connection (Temporal/Postgres/SQLite/etc)
    ledger?: {
        type: 'temporal' | 'postgres' | 'sqlite' | 'custom';
        connection: string;  // Connection string or endpoint
    };
    
    // Optional: Webhook for notifications
    webhook?: {
        url: string;
        events?: string[];
    };
}
```

## Usage

### Without configuration (ephemeral)
```typescript
// Just browse and search - nothing logged
const results = await sidecar.search('query');
const rendered = await sidecar.render(url);
```

### With ledger (persistent)
```typescript
// Logs findings to ledger
const finding = await sidecar.search('query', { logToLedger: true });
```

### With custom endpoints
```typescript
// Use your own search/LLM providers
const results = await sidecar.search('query', {
    endpoint: 'https://your-search-api.com',
    responsePath: 'results.items'
});
```

## Plug Interface

### View Plug
```typescript
interface ViewPlug {
    regionQuery: RegionQuery;
    render: (results: any) => HTMLElement;
}
```

### Entry Plug
```typescript
interface EntryPlug {
    judgmentType: string;
    capture: () => Judgment;
    submit: (judgment: Judgment) => void;
}
```

## IPC Protocol

Communicates with Tauri app via stdin/stdout:

```json
// Input (from Tauri)
{
    "type": "search",
    "query": "search term",
    "config": { ... }
}

// Output (to Tauri)
{
    "type": "results",
    "data": [...],
    "logged": true
}
```
