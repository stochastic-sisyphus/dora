import { invoke } from '@tauri-apps/api/core';

/**
 * Toggles the navigator sidecar on the main window.
 * Opens: widens window, attaches research pane to the right.
 * Closes: removes research pane, restores original window size.
 */
export async function toggleNavigator(): Promise<void> {
	await invoke('toggle_navigator');
}
