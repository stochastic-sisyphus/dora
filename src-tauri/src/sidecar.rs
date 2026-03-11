#[tauri::command]
pub async fn searxng_search(query: String, base_url: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/search", base_url))
        .query(&[("q", &query), ("format", &"json".to_string())])
        .send()
        .await
        .map_err(|e| format!("SearXNG request failed: {}", e))?;

    resp.json()
        .await
        .map_err(|e| format!("SearXNG parse failed: {}", e))
}

#[tauri::command]
pub async fn extract_research(
    content: String,
    openrouter_api_key: String,
) -> Result<serde_json::Value, String> {
    let schema = serde_json::json!({
        "type": "object",
        "properties": {
            "topic": { "type": "string" },
            "key_claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "statement": { "type": "string" },
                        "source_url": { "type": "string" },
                        "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
                    },
                    "required": ["statement", "source_url", "confidence"],
                    "additionalProperties": false
                }
            },
            "consensus": { "type": "string" },
            "contradictions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim_a": { "type": "string" },
                        "claim_b": { "type": "string" },
                        "note": { "type": "string" }
                    },
                    "required": ["claim_a", "claim_b", "note"],
                    "additionalProperties": false
                }
            },
            "knowledge_gaps": { "type": "array", "items": { "type": "string" } },
            "search_quality": { "type": "string", "enum": ["rich", "sparse", "off_topic"] }
        },
        "required": ["topic", "key_claims", "consensus", "contradictions", "knowledge_gaps", "search_quality"],
        "additionalProperties": false
    });

    let system = "You are a research analyst. Extract structured information from these search result snippets. \
        Be precise — only state claims with direct support in the provided text. \
        Identify genuine contradictions between sources, not just different framings. \
        knowledge_gaps are questions the results don't answer.";

    let body = serde_json::json!({
        "model": "openrouter/auto",
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": content }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "ResearchExtraction",
                "strict": true,
                "schema": schema
            }
        }
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", openrouter_api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenRouter request failed: {}", e))?;

    let resp_json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("OpenRouter parse failed: {}", e))?;

    let content_str = resp_json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("No content in response")?;

    serde_json::from_str(content_str)
        .map_err(|e| format!("Failed to parse extraction JSON: {}", e))
}
