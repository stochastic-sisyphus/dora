use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::ipc::Channel;

#[derive(Serialize, Deserialize)]
pub struct InquiryRow {
    pub id: u32,
    pub question: String,
    pub status: String,
    pub finding_count: u32,
}

#[derive(Serialize, Deserialize)]
pub struct InquiryResult {
    pub inquiry: InquiryRow,
    pub findings: Vec<serde_json::Value>,
    pub gaps: Vec<serde_json::Value>,
}

fn resolve_bin(name: &str) -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    for path in [
        format!("{}/.local/share/mise/shims/{}", home, name),
        format!("{}/.local/bin/{}", home, name),
        format!("/usr/local/bin/{}", name),
    ] {
        if Path::new(&path).exists() {
            return path;
        }
    }
    name.to_string()
}

#[tauri::command]
pub async fn run_fabric(
    pattern: String,
    input: String,
    on_chunk: Channel<String>,
) -> Result<(), String> {
    use std::process::Stdio;
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
    use tokio::process::Command;

    let bin = resolve_bin("fabric");
    let mut child = Command::new(&bin)
        .args(["-p", &pattern])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn fabric: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        drop(stdin);
    }

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
            on_chunk.send(line).map_err(|e| e.to_string())?;
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("fabric exited with status {}", status));
    }
    Ok(())
}

#[tauri::command]
pub async fn inquiry_list() -> Result<Vec<InquiryRow>, String> {
    use std::process::Command;

    let bin = resolve_bin("inquiry");
    let output = Command::new(&bin)
        .args(["list", "--json"])
        .output()
        .map_err(|e| format!("Failed to run inquiry: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inquiry_ask(question: String) -> Result<InquiryResult, String> {
    use std::process::Command;

    let bin = resolve_bin("inquiry");
    let output = Command::new(&bin)
        .args(["ask", "--json", &question])
        .output()
        .map_err(|e| format!("Failed to run inquiry: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inquiry_show(id: u32) -> Result<InquiryResult, String> {
    use std::process::Command;

    let bin = resolve_bin("inquiry");
    let output = Command::new(&bin)
        .args(["show", "--json", &id.to_string()])
        .output()
        .map_err(|e| format!("Failed to run inquiry: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inquiry_dig(id: u32) -> Result<InquiryResult, String> {
    use std::process::Command;

    let bin = resolve_bin("inquiry");
    let output = Command::new(&bin)
        .args(["dig", "--json", &id.to_string()])
        .output()
        .map_err(|e| format!("Failed to run inquiry: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}

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
pub async fn list_fabric_patterns() -> Result<Vec<String>, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let patterns_dir = format!("{}/.config/fabric/patterns", home);
    let mut patterns = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&patterns_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    patterns.push(name.to_string());
                }
            }
        }
    }

    patterns.sort();
    Ok(patterns)
}
