use tauri::Manager;
#[cfg(feature = "navigator")]
use tauri::{WebviewUrl, WindowEvent};

#[cfg(feature = "navigator")]
const NAVIGATOR_SPLIT: f64 = 0.55;

#[cfg(feature = "navigator")]
#[tauri::command]
async fn open_navigator(app: tauri::AppHandle) -> Result<(), String> {
    // If the navigator window already exists, focus window AND the chat webview.
    // Focusing only the window can leave the chat webview in a stale render state.
    if let Some(window) = app.get_window("navigator") {
        window.set_focus().map_err(|e| e.to_string())?;
        if let Some(chat) = app.get_webview("navigator-chat") {
            let _ = chat.set_focus();
        }
        return Ok(());
    }

    let width: f64 = 1400.0;
    let height: f64 = 900.0;

    // Create a bare window (no default webview) for the split layout
    let window = tauri::window::WindowBuilder::new(&app, "navigator")
        .title("Navigator")
        .inner_size(width, height)
        .min_inner_size(800.0, 500.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    let left_width = (width * NAVIGATOR_SPLIT).round();
    let right_width = width - left_width;

    // Left pane: Open WebUI chat.
    // .focused(true) ensures the webview gets initial focus, which triggers
    // the first paint on macOS wry. Without this, the webview can remain blank
    // if the right pane steals focus during creation.
    // .on_page_load forces a size re-set after the page finishes loading,
    // which works around a wry race where child webviews render at 0x0
    // if the window hasn't fully laid out yet.
    let left = window
        .add_child(
            tauri::webview::WebviewBuilder::new(
                "navigator-chat",
                WebviewUrl::App("/".into()),
            )
            .focused(true)
            .on_page_load(move |webview, payload| {
                if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                    // Force a re-layout by reading current size and re-applying it.
                    // This nudges wry/WebKit into a
                    // repaint when the initial render was missed.
                    if let Ok(size) = webview.size() {
                        let _ = webview.set_size(size);
                    }
                }
            }),
            tauri::LogicalPosition::new(0.0, 0.0),
            tauri::LogicalSize::new(left_width, height),
        )
        .map_err(|e| e.to_string())?;

    // Right pane: Research view
    let right = window
        .add_child(
            tauri::webview::WebviewBuilder::new(
                "navigator-research",
                WebviewUrl::App("navigator.html".into()),
            ),
            tauri::LogicalPosition::new(left_width, 0.0),
            tauri::LogicalSize::new(right_width, height),
        )
        .map_err(|e| e.to_string())?;

    // Handle resize: reposition both webviews when the window size changes.
    // The Resized event provides PhysicalSize, but child webview set_size /
    // set_position on macOS operate in logical (point) coordinates internally.
    // Passing raw physical values on a HiDPI display (scale_factor 2) doubles
    // the intended dimensions, causing webviews to overlap and swallow clicks.
    // Convert to logical units via the window's scale factor.
    let win_ref = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Resized(phys) = event {
            let scale = win_ref.scale_factor().unwrap_or(1.0);
            let w = phys.width as f64 / scale;
            let h = phys.height as f64 / scale;

            let left_w = (w * NAVIGATOR_SPLIT).round();
            let right_w = w - left_w;

            let _ = left.set_position(tauri::LogicalPosition::new(0.0, 0.0));
            let _ = left.set_size(tauri::LogicalSize::new(left_w, h));
            let _ = right.set_position(tauri::LogicalPosition::new(left_w, 0.0));
            let _ = right.set_size(tauri::LogicalSize::new(right_w, h));
        }
    });

    Ok(())
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
        builder = builder.invoke_handler(tauri::generate_handler![open_navigator]);
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
