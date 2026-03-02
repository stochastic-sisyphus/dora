import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { DEFAULT_CONFIG } from '../constants';
import onShortcut from '../handlers/on-shortcut';

export async function setShortcut(keybind: string, oldKeybind?: string): Promise<boolean> {
	try {
		// unregister old shortcut
		if (oldKeybind) {
			await unregister(oldKeybind);
		}

		// attempt to register new shortcut
		await register(keybind, onShortcut);
		console.log('Set chatbar shortcut to', keybind);
		return true;
	} catch {
		oldKeybind = oldKeybind || DEFAULT_CONFIG.shortcut;

		console.warn(`Shortcut ${keybind} is not valid, using ${oldKeybind}`);
		// re-register old shortcut
		await register(oldKeybind, onShortcut);
		return false;
	}
}
