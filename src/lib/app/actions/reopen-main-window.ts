import type { Event } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Window } from '@tauri-apps/api/window';
import { MAIN_WINDOW_OPTIONS } from '../constants';

/**
 * Reopen the main window ONLY IF it's closed.
 * @returns Promise resolves upon successful window creation, rejects on error.
 */
export default async function reopenMainWindow() {
	if (await Window.getByLabel('main')) {
		console.debug('Main window already open.');
		return;
	} else {
		return new Promise<void>((resolve, reject) => {
			console.debug('Main window closed, reopening...');
			try {
				const window = new WebviewWindow('main', MAIN_WINDOW_OPTIONS);
				console.log(window);
				window.once('tauri://window-created', (event: Event<unknown>) => {
					console.debug('Main window created:', event);
					resolve();
				});
				window.once('tauri://error', (event: Event<unknown>) => {
					console.error('Error creating main window:', event);
					reject(event.payload);
				});
			} catch (e) {
				console.error('Error creating main window:', e);
				reject(e);
			}
		});
	}
}
