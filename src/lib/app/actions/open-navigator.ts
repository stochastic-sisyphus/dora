import type { Event } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Window } from '@tauri-apps/api/window';

/**
 * Open or focus the navigator (research) window.
 * If the window already exists, show and focus it.
 * Otherwise, create a new one.
 */
export default async function openNavigator(): Promise<void> {
	const existing = await Window.getByLabel('navigator');
	if (existing) {
		await existing.show();
		await existing.setFocus();
		return;
	}

	return new Promise<void>((resolve, reject) => {
		try {
			const window = new WebviewWindow('navigator', {
				url: '/research',
				title: 'Research',
				width: 1200,
				height: 800,
				titleBarStyle: 'Overlay',
				hiddenTitle: true,
				resizable: true,
				minimizable: true
			});
			window.once('tauri://window-created', (event: Event<unknown>) => {
				console.debug('Navigator window created:', event);
				resolve();
			});
			window.once('tauri://error', (event: Event<unknown>) => {
				console.error('Error creating navigator window:', event);
				reject(event.payload);
			});
		} catch (e) {
			console.error('Error creating navigator window:', e);
			reject(e);
		}
	});
}
