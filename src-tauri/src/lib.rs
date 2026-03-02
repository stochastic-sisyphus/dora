use tauri::{Manager, WebviewUrl, WindowEvent};

/// Split ratio for the navigator dual-pane layout.
/// Left pane (chat) gets this fraction, right pane gets the rest.
const NAVIGATOR_SPLIT: f64 = 0.55;

/// Opens or focuses the navigator dual-pane window.
/// Left pane: Open WebUI chat. Right pane: Research view placeholder.
#[tauri::command]
async fn open_navigator(app: tauri::AppHandle) -> Result<(), String> {
    // If the navigator window already exists, just focus it
    if let Some(window) = app.get_window("navigator") {
        window.set_focus().map_err(|e| e.to_string())?;
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

    // Left pane: Open WebUI chat (loads "/" -- same as main window)
    let left = window
        .add_child(
            tauri::webview::WebviewBuilder::new(
                "navigator-chat",
                WebviewUrl::App("/".into()),
            ),
            tauri::LogicalPosition::new(0.0, 0.0),
            tauri::LogicalSize::new(left_width, height),
        )
        .map_err(|e| e.to_string())?;

    // Right pane: Research view placeholder
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
    // The Resized event gives PhysicalSize, so we use physical units throughout.
    window.on_window_event(move |event| {
        if let WindowEvent::Resized(size) = event {
            let left_w = (size.width as f64 * NAVIGATOR_SPLIT).round() as u32;
            let right_w = size.width.saturating_sub(left_w);

            let _ = left.set_position(tauri::PhysicalPosition::new(0, 0));
            let _ = left.set_size(tauri::PhysicalSize::new(left_w, size.height));
            let _ = right.set_position(tauri::PhysicalPosition::new(left_w as i32, 0));
            let _ = right.set_size(tauri::PhysicalSize::new(right_w, size.height));
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_navigator]);

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
