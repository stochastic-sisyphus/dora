import { PhysicalPosition, Window, currentMonitor } from '@tauri-apps/api/window';
import {
	CHATBAR_BOTTOM_MARGIN,
	CHATBAR_HORIZONTAL_MARGIN,
	CHATBAR_WINDOW_LABEL
} from '../constants';
import type { ChatBarPosition } from '../state';

export default async function moveChatBar(
	chatBarPosition: ChatBarPosition,
	companionChatOpen: boolean
) {
	console.debug('Moving chatbar to: ', chatBarPosition);

	if (chatBarPosition === 'REMEMBER_LAST') {
		return;
	}

	const window = await Window.getByLabel(CHATBAR_WINDOW_LABEL);
	const monitor = await currentMonitor();

	if (!window) {
		throw new Error('Failed to get chatbar window');
	} else if (!monitor) {
		throw new Error('Failed to get monitor');
	}

	const windowSize = await window.outerSize();
	let x: number, y: number;
	switch (chatBarPosition) {
		case 'BOTTOM_CENTER':
			x = Math.floor(monitor.position.x + (monitor.size.width - windowSize.width) / 2);
			y = Math.floor(
				monitor.position.y + (monitor.size.height - windowSize.height - CHATBAR_BOTTOM_MARGIN)
			);
			break;
		case 'BOTTOM_LEFT':
			x = monitor.position.x + CHATBAR_HORIZONTAL_MARGIN;
			y = Math.floor(
				monitor.position.y + (monitor.size.height - windowSize.height - CHATBAR_BOTTOM_MARGIN)
			);
			break;
		case 'BOTTOM_RIGHT':
			x = Math.floor(
				monitor.position.x + (monitor.size.width - windowSize.width) - CHATBAR_HORIZONTAL_MARGIN
			);
			y = Math.floor(
				monitor.position.y + (monitor.size.height - windowSize.height - CHATBAR_BOTTOM_MARGIN)
			);
			break;
		default:
			throw new Error('Invalid chatbar position');
	}

	await window.setPosition(new PhysicalPosition(x, y));
}
