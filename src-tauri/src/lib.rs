use tauri::Manager;
#[cfg(feature = "navigator")]
use tauri::{WebviewUrl, WindowEvent};
#[cfg(feature = "navigator")]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(feature = "navigator")]
use std::sync::Mutex;

#[cfg(feature = "navigator")]
const NAVIGATOR_SPLIT: f64 = 0.55;

#[cfg(feature = "navigator")]
struct NavigatorState {
    open: AtomicBool,
    original_size: Mutex<Option<tauri::LogicalSize<f64>>>,
}

#[cfg(feature = "navigator")]
impl Default for NavigatorState {
    fn default() -> Self {
        Self {
            open: AtomicBool::new(false),
            original_size: Mutex::new(None),
        }
    }
}

#[cfg(feature = "navigator")]
#[tauri::command]
async fn toggle_navigator(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<NavigatorState>();

    if state.open.load(Ordering::SeqCst) {
        // === CLOSE: remove navigator, restore original size ===
        if let Some(webview) = app.get_webview("navigator-research") {
            webview.close().map_err(|e| e.to_string())?;
        }

        let window = app.get_window("main").ok_or("main window not found")?;
        let main_wv = app.get_webview("main").ok_or("main webview not found")?;

        // Restore original window size
        if let Some(orig) = state.original_size.lock().unwrap().take() {
            window.set_size(orig).map_err(|e| e.to_string())?;
        }

        // Main webview fills window
        let size = window.inner_size().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().unwrap_or(1.0);
        let w = size.width as f64 / scale;
        let h = size.height as f64 / scale;
        let _ = main_wv.set_position(tauri::LogicalPosition::new(0.0, 0.0));
        let _ = main_wv.set_size(tauri::LogicalSize::new(w, h));

        state.open.store(false, Ordering::SeqCst);
    } else {
        // === OPEN: widen window, shrink main webview, attach navigator ===
        let window = app.get_window("main").ok_or("main window not found")?;
        let main_wv = app.get_webview("main").ok_or("main webview not found")?;

        // Store current size before widening
        let current = window.inner_size().map_err(|e| e.to_string())?;
        let scale = window.scale_factor().unwrap_or(1.0);
        let current_w = current.width as f64 / scale;
        let current_h = current.height as f64 / scale;

        *state.original_size.lock().unwrap() = Some(tauri::LogicalSize::new(current_w, current_h));

        // Widen window to at least 1400 logical px
        let new_w = current_w.max(1400.0);
        let new_h = current_h.max(800.0);
        window
            .set_size(tauri::LogicalSize::new(new_w, new_h))
            .map_err(|e| e.to_string())?;

        // Shrink main webview to left 55%
        let left_w = (new_w * NAVIGATOR_SPLIT).round();
        let _ = main_wv.set_position(tauri::LogicalPosition::new(0.0, 0.0));
        let _ = main_wv.set_size(tauri::LogicalSize::new(left_w, new_h));

        // Add navigator webview on the right, loading the SvelteKit route
        let right_w = new_w - left_w;
        window
            .add_child(
                tauri::webview::WebviewBuilder::new(
                    "navigator-research",
                    WebviewUrl::App("/navigator".into()),
                )
                .on_page_load(move |webview, payload| {
                    if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                        // Nudge wry/WebKit into a repaint (proven workaround)
                        if let Ok(size) = webview.size() {
                            let _ = webview.set_size(size);
                        }
                    }
                }),
                tauri::LogicalPosition::new(left_w, 0.0),
                tauri::LogicalSize::new(right_w, new_h),
            )
            .map_err(|e| e.to_string())?;

        state.open.store(true, Ordering::SeqCst);
    }

    Ok(())
}

/// Server-side SearXNG fetch — bypasses Authelia since the request
/// comes from the Tauri backend, not a browser webview.
#[cfg(feature = "navigator")]
#[tauri::command]
async fn searxng_search(
    query: String,
    categories: Option<String>,
    searxng_url: Option<String>,
) -> Result<String, String> {
    let base = searxng_url.unwrap_or_else(|| "https://search.schrodingers.lol".to_string());
    let cats = categories.unwrap_or_else(|| "general".to_string());
    let url = format!(
        "{}/search?q={}&format=json&categories={}",
        base.trim_end_matches('/'),
        urlencoding::encode(&query),
        urlencoding::encode(&cats),
    );
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    resp.text().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_opener::init());

    #[cfg(feature = "navigator")]
    {
        builder = builder
            .manage(NavigatorState::default())
            .invoke_handler(tauri::generate_handler![toggle_navigator, searxng_search])
            .setup(|app| {
                // Resize handler: maintains split ratio when navigator is open.
                // Installed once at startup, checks NavigatorState on each resize.
                let window = app.get_window("main").expect("main window must exist");
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Resized(phys) = event {
                        let state = app_handle.state::<NavigatorState>();
                        if !state.open.load(Ordering::SeqCst) {
                            return;
                        }
                        let scale = app_handle
                            .get_window("main")
                            .and_then(|w| w.scale_factor().ok())
                            .unwrap_or(1.0);
                        let w = phys.width as f64 / scale;
                        let h = phys.height as f64 / scale;

                        let left_w = (w * NAVIGATOR_SPLIT).round();
                        let right_w = w - left_w;

                        if let Some(main_wv) = app_handle.get_webview("main") {
                            let _ = main_wv.set_position(tauri::LogicalPosition::new(0.0, 0.0));
                            let _ = main_wv.set_size(tauri::LogicalSize::new(left_w, h));
                        }
                        if let Some(nav_wv) = app_handle.get_webview("navigator-research") {
                            let _ =
                                nav_wv.set_position(tauri::LogicalPosition::new(left_w, 0.0));
                            let _ = nav_wv.set_size(tauri::LogicalSize::new(right_w, h));
                        }
                    }
                });
                Ok(())
            });
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app_handle, _event| {
            // Event handling can be added here as needed
        });
}
