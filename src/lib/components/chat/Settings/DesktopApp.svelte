<script lang="ts">
	import { probeCompatibleServer } from '$lib/apis';
	import { APP_STORE_FILE } from '$lib/app/constants';
	import { setShortcut } from '$lib/app/commands/set-shortcut';
	import type { ChatBarPosition, ResetChatTime } from '$lib/app/state';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Switch from '$lib/components/common/Switch.svelte';
	import { appConfig, COMPATIBLE_SERVER_URL } from '$lib/stores';
	import { delay } from '$lib/utils';
	import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
	import * as autoStart from '@tauri-apps/plugin-autostart';
	import { isRegistered, unregister } from '@tauri-apps/plugin-global-shortcut';
	import { getStore } from '@tauri-apps/plugin-store';
	import type { i18n as i18nT } from 'i18next';
	import { createEventDispatcher, getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { Writable } from 'svelte/store';
	import ShortcutEntry from './DesktopApp/ShortcutEntry.svelte';

	const BANNED_SHORTCUTS = [
		'cmd+c',
		'cmd+v',
		'cmd+a',
		'cmd+x',
		'cmd+z',
		'cmd+shift+z',
		'cmd+s',
		'cmd+shift+s',
		'cmd+backspace',
		'cmd+shift+backspace',
		'cmd+q',
		'cmd+w',
		'cmd+shift+w',
		'cmd+f',
		'cmd+m'
	];

	const dispatch = createEventDispatcher();

	const i18n: Writable<i18nT> = getContext('i18n');

	// Settings
	let positionOnScreen: ChatBarPosition;
	const positionOnScreenChangeHandler = () => {};

	let resetToNewChat: ResetChatTime;
	const resetToNewChatChangeHandler = () => {};

	let keyboardShortcut: string;
	const keyboardShortcutChangeHandler = async () => {
		try {
			if (keyboardShortcut !== $appConfig.shortcut && (await isRegistered(keyboardShortcut))) {
				toast.error($i18n.t('Shortcut already in use. Please try another.'));
				keyboardShortcut = $appConfig.shortcut;
			} else if (BANNED_SHORTCUTS.includes(keyboardShortcut.toLowerCase())) {
				toast.error($i18n.t('Invalid shortcut. Please try another.'));
				keyboardShortcut = $appConfig.shortcut;
			}
		} catch {
			toast.error($i18n.t('Invalid shortcut. Please try another.'));
			keyboardShortcut = $appConfig.shortcut;
		}
	};
	const keyboardShortcutClearHandler = () => {
		keyboardShortcut = '';
	};

	let openNewChatsInCompanion: string;
	const openNewChatsChangeHandler = () => {};

	let launchAtLogin: boolean;
	const launchAtLoginChangeHandler = () => {};

	let openLinksInApp: boolean;
	const openLinksInAppChangeHandler = () => {};

	let openrouterApiKey = '';
	let searxngUrl = '';
	let surrealdbUrl = '';
	let compatibleServerUrl = '';
	let showConfirmDialog = false;

	const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

	const resetCompatibleServerUrl = async () => {
		showConfirmDialog = true;
	};

	const handleConfirm = async () => {
		await getCurrentWebviewWindow().clearAllBrowsingData();
		$COMPATIBLE_SERVER_URL = '';
		$appConfig = { ...$appConfig, webuiBaseUrl: '' };
		window.location.href = '/setup';
	};

	const saveConfig = async () => {
		console.debug('Saving settings. Before:', Object.entries($appConfig));
		// sets shortcut and saves to config

		console.debug('Right before set:', keyboardShortcut);
		let shortcut = $appConfig.shortcut;
		if (keyboardShortcut !== $appConfig.shortcut) {
			if (keyboardShortcut === '') {
				await unregister($appConfig.shortcut);
				shortcut = '';
			} else if (await setShortcut(keyboardShortcut, $appConfig.shortcut)) {
				shortcut = keyboardShortcut;
			} else {
				keyboardShortcut = $appConfig.shortcut;
				delay(50).then(() => toast.warning($i18n.t('Failed to set shortcut. Please try again.')));
			}
		}

		try {
			if (launchAtLogin) {
				await autoStart.enable();
			} else {
				await autoStart.disable();
			}
		} catch (e) {
			console.error('Failed to set launch at login to', launchAtLogin, e);
		}

		const normalizedCompatibleServerUrl = normalizeBaseUrl(compatibleServerUrl);
		if (!normalizedCompatibleServerUrl) {
			toast.error($i18n.t('Please enter a server URL.'));
			return;
		}

		const serverChanged = normalizedCompatibleServerUrl !== $COMPATIBLE_SERVER_URL;
		if (serverChanged) {
			try {
				await probeCompatibleServer(normalizedCompatibleServerUrl);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : String(error));
				return;
			}
		}

		$appConfig = {
			...$appConfig,
			shortcut,
			webuiBaseUrl: normalizedCompatibleServerUrl,
			chatBarPositionPreference: positionOnScreen,
			resetChatTimePreference: resetToNewChat,
			openChatsInCompanion: openNewChatsInCompanion === 'true',
			openLinksInApp,
			substrate: { ...$appConfig.substrate, openrouterApiKey, searxngUrl, surrealdbUrl }
		};
		$COMPATIBLE_SERVER_URL = normalizedCompatibleServerUrl;

		if (serverChanged) {
			const store = await getStore(APP_STORE_FILE);
			for (const key of (await store?.keys()) || []) {
				if (!['app_config', 'compatible_server_url', 'theme'].includes(key)) {
					await store?.delete(key);
				}
			}
			await store?.save();
			localStorage.removeItem('token');
			await getCurrentWebviewWindow().clearAllBrowsingData();
			window.location.href = '/';
			return;
		}

		console.debug('After:', $appConfig);
		dispatch('save');
	};

	onMount(async () => {
		positionOnScreen = $appConfig.chatBarPositionPreference;
		resetToNewChat = $appConfig.resetChatTimePreference;
		keyboardShortcut = $appConfig.shortcut;
		openNewChatsInCompanion = $appConfig.openChatsInCompanion ? 'true' : 'false';
		launchAtLogin = await autoStart.isEnabled();
		openLinksInApp = $appConfig.openLinksInApp;
		openrouterApiKey = $appConfig?.substrate?.openrouterApiKey ?? '';
		searxngUrl = $appConfig?.substrate?.searxngUrl ?? '';
		surrealdbUrl = $appConfig?.substrate?.surrealdbUrl ?? '';
		compatibleServerUrl = $COMPATIBLE_SERVER_URL || $appConfig.webuiBaseUrl || '';
	});
</script>

<div class="flex flex-col flex-grow flex-shrink justify-between text-sm">
	<div class="overflow-y-scroll max-h-[28rem] lg:max-h-full">
		<div class="">
			<div class=" mb-1 text-sm font-medium">{$i18n.t('Desktop App Settings')}</div>

			<div class="flex w-full justify-between">
				<div class=" self-center text-xs font-medium">{$i18n.t('Position on Screen')}</div>
				<div class="flex items-center relative">
					<select
						class="text-right dark:bg-gray-900 w-fit pr-8 rounded py-2 px-2 text-xs bg-transparent outline-none"
						bind:value={positionOnScreen}
						on:change={positionOnScreenChangeHandler}
					>
						<option value="BOTTOM_CENTER">{$i18n.t('Bottom Center')}</option>
						<option value="BOTTOM_LEFT">{$i18n.t('Bottom Left')}</option>
						<option value="BOTTOM_RIGHT">{$i18n.t('Bottom Right')}</option>
						<option value="REMEMBER_LAST">{$i18n.t('Remember Last')}</option>
					</select>
				</div>
			</div>

			<div class=" flex w-full justify-between">
				<div class=" self-center text-xs font-medium">{$i18n.t('Reset to New Chat')}</div>
				<div class="flex items-center relative">
					<select
						class="text-right dark:bg-gray-900 w-fit pr-8 rounded py-2 px-2 text-xs bg-transparent outline-none"
						bind:value={resetToNewChat}
						on:change={resetToNewChatChangeHandler}
					>
						<option value="IMMEDIATELY">{$i18n.t('Immediately')}</option>
						<option value="10_MIN">{$i18n.t('After 10 minutes')}</option>
						<option value="15_MIN">{$i18n.t('After 15 minutes')}</option>
						<option value="30_MIN">{$i18n.t('After 30 minutes')}</option>
						<option value="NEVER">{$i18n.t('Never')}</option>
					</select>
				</div>
			</div>

			<div class=" flex w-full justify-between">
				<div class=" self-center text-xs font-medium">{$i18n.t('Keyboard Shortcut')}</div>
				<div class="flex items-center relative">
					<ShortcutEntry
						bind:value={keyboardShortcut}
						on:change={keyboardShortcutChangeHandler}
						on:clear={keyboardShortcutClearHandler}
					/>
				</div>
			</div>

			<div class=" flex w-full justify-between">
				<div class=" self-center text-xs font-medium">{$i18n.t('Open New Chats')}</div>
				<div class="flex items-center relative">
					<select
						class="text-right dark:bg-gray-900 w-fit pr-8 rounded py-2 px-2 text-xs bg-transparent outline-none"
						bind:value={openNewChatsInCompanion}
						on:change={openNewChatsChangeHandler}
						disabled={true}
					>
						<option value="true">{$i18n.t('In Companion Chat')}</option>
						<option value="false">{$i18n.t('In Main Window')}</option>
					</select>
				</div>
			</div>
		</div>

		<div class=" flex w-full justify-between">
			<div class=" self-center text-xs font-medium">
				{$i18n.t('Open Compatible Server Links in Desktop App')}
			</div>
			<div class="flex items-center relative">
				<div class="mt-1">
					<Switch
						bind:state={openLinksInApp}
						on:change={openLinksInAppChangeHandler}
						disabled={true}
					/>
				</div>
			</div>
		</div>

		<div class=" flex w-full justify-between">
			<div class=" self-center text-xs font-medium">{$i18n.t('Launch at Login')}</div>
			<div class="flex items-center relative">
				<div class="mt-1">
					<Switch bind:state={launchAtLogin} on:change={launchAtLoginChangeHandler} />
				</div>
			</div>
			
			<!-- Legacy Search URL -->
			<div class="mt-4">
				<div class="text-sm font-medium mb-1">Legacy Search URL</div>
				<input
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					type="url"
					placeholder="https://search.your-domain.com"
					bind:value={searxngUrl}
				/>
				<div class="text-xs text-gray-500 mt-1">
					Legacy desktop-app search setting. New research flows use Sidecar Configuration.
				</div>
			</div>
			
			<!-- SurrealDB URL -->
			<div class="mt-4">
				<div class="text-sm font-medium mb-1">SurrealDB URL</div>
				<input
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					type="url"
					placeholder="https://sync.your-domain.com"
					bind:value={surrealdbUrl}
				/>
				<div class="text-xs text-gray-500 mt-1">
					Your SurrealDB instance URL for data synchronization
				</div>
			</div>
		</div>

		<hr class=" dark:border-gray-850 my-3" />

		<div class="">
			<div class=" mb-1 text-sm font-medium">{$i18n.t('Substrate Settings')}</div>

			<div>
				<div class="text-sm font-medium mb-1">{$i18n.t('OpenRouter API Key')}</div>
				<input
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					type="password"
					placeholder="sk-or-..."
					bind:value={openrouterApiKey}
				/>
				<div class="text-xs text-gray-500 mt-1">
					{$i18n.t('Used for structured extraction in the research panel.')}
				</div>
			</div>
			
			<!-- Legacy Search URL -->
			<div class="mt-4">
				<div class="text-sm font-medium mb-1">Legacy Search URL</div>
				<input
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					type="url"
					placeholder="https://search.your-domain.com"
					bind:value={searxngUrl}
				/>
				<div class="text-xs text-gray-500 mt-1">
					Legacy desktop-app search setting. New research flows use Sidecar Configuration.
				</div>
			</div>
			
			<!-- SurrealDB URL -->
			<div class="mt-4">
				<div class="text-sm font-medium mb-1">SurrealDB URL</div>
				<input
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					type="url"
					placeholder="https://sync.your-domain.com"
					bind:value={surrealdbUrl}
				/>
				<div class="text-xs text-gray-500 mt-1">
					Your SurrealDB instance URL for data synchronization
				</div>
			</div>
		</div>

		<hr class=" dark:border-gray-850 my-3" />

		<div>
			<div class="mb-1 text-sm font-medium">Compatible Server URL</div>
			<div class="flex items-center gap-2">
				<input
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
					type="url"
					placeholder="https://your-server.example.com"
					bind:value={compatibleServerUrl}
				/>
				<button
					class="shrink-0 px-3 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 transition"
					on:click={resetCompatibleServerUrl}
				>
					Reset
				</button>
			</div>
			<div class="text-xs text-gray-500 mt-1">
				Change this to point Dora at a different Open WebUI server or compatible backend. Saving reloads the app against the new URL.
			</div>
		</div>
	</div>
	<div class="flex justify-end pt-3 text-sm font-medium">
		<button
			class="px-3.5 py-1.5 text-sm font-medium bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full"
			on:click={saveConfig}
		>
			{$i18n.t('Save')}
		</button>
	</div>
</div>

<ConfirmDialog
	bind:show={showConfirmDialog}
	title="Change Compatible Server Base URL"
	message="Are you sure you want to change the Compatible Server base URL?"
	onConfirm={handleConfirm}
/>
