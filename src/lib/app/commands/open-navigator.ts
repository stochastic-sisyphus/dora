import { invoke } from '@tauri-apps/api/core';

/**
 * Opens the navigator dual-pane window (chat + research view).
 * If already open, focuses the existing window.
 */
export async function openNavigator(): Promise<void> {
	await invoke('open_navigator');
}
