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

	const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
	new WebviewWindow('navigator', {
		url: '/research',
		title: 'Research',
		width: 1200,
		height: 800,
		titleBarStyle: 'Overlay',
		hiddenTitle: true,
		resizable: true,
		minimizable: true
	});
}
