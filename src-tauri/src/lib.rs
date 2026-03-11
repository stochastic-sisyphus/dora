mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            sidecar::run_fabric,
            sidecar::inquiry_list,
            sidecar::inquiry_ask,
            sidecar::inquiry_show,
            sidecar::inquiry_dig,
            sidecar::searxng_search,
            sidecar::list_fabric_patterns,
        ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app_handle, _event| {
            // Event handling can be added here as needed
        });
}
