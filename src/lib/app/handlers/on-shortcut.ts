import { appConfig, appState } from '$lib/stores';
import { Window } from '@tauri-apps/api/window';
import type { ShortcutEvent } from '@tauri-apps/plugin-global-shortcut';
import { get } from 'svelte/store';
import moveChatBar from '../actions/move-chatbar';
import { CHATBAR_WINDOW_LABEL, CHATBAR_WINDOW_SIZE, COMPANION_CHAT_EXPIRED } from '../constants';
import { resetChatTimePreferenceToSeconds } from '../state';

export default async function onShortcut(event: ShortcutEvent) {
	console.log('onShortcut');
	if (event.state !== 'Pressed') {
		return;
	}

	// get state
	const state = get(appState);
	if (!state) {
		throw new Error('Failed to get App State');
	}

	// get config
	const config = get(appConfig);
	if (!config) {
		throw new Error('Failed to get App Config');
	}

	// get window
	const window = await Window.getByLabel(CHATBAR_WINDOW_LABEL);
	if (!window) {
		throw new Error('Failed to get chatbar window');
	}

	// if visible, then hide
	if (await window.isVisible()) {
		if (state.companionChatOpen && !(await window.isFocused())) {
			await window.setFocus();
			document.getElementById('chat-input')?.focus();
		} else {
			await window.hide();
		}
		return;
	}

	const lastChatTime = state.lastChatTime;
	const timeSinceLastChat = Date.now() - lastChatTime;
	const companionChatOpen = state.companionChatOpen;
	const resetChatTime = resetChatTimePreferenceToSeconds(config.resetChatTimePreference);
	const chatBarPosition = config.chatBarPositionPreference;
	console.log('timeSinceLastChat', timeSinceLastChat, 'resetChatTime', resetChatTime);
	if (companionChatOpen && timeSinceLastChat > resetChatTime) {
		await window.emitTo('chatbar', COMPANION_CHAT_EXPIRED);
		await window.setResizable(false);
		await window.setSize(CHATBAR_WINDOW_SIZE);
		await moveChatBar(chatBarPosition, companionChatOpen);
		// 1/60s delay to allow movement, resizing, state change before it appears
		await new Promise((resolve) => setTimeout(resolve, 17));
	} else if (!companionChatOpen) {
		await moveChatBar(chatBarPosition, companionChatOpen);
	}

	await window.show();
	await window.setFocus();
	document.getElementById('chat-input')?.focus();
}
