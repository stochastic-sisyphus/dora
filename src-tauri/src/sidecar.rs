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
