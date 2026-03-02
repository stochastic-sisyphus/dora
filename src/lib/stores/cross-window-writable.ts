import { APP_STORE_FILE } from '$lib/app/constants';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getStore, load, Store } from '@tauri-apps/plugin-store';
import equal from 'fast-deep-equal';
import { get, writable, type Writable } from 'svelte/store';

export function crossWindowWritable<T>(
	name: string,
	initialValue?: T,
	persist: boolean = false
): Writable<T> {
	console.debug('Creating cross window store for', name);
	const wrappedStore = writable<T>(initialValue);
	let currentValue = get(wrappedStore);
	let storePromise: Promise<Store | null>;

	// Initialize store connection asynchronously
	storePromise = (async () => {
		try {
			const store =
				(await getStore(APP_STORE_FILE)) ||
				(await load(APP_STORE_FILE, { autoSave: false, createNew: false }));

			// Get initial value from store
			const stored = await store.get(name);
			await store.save();
			if (stored !== undefined) {
				currentValue = stored as T;
				console.debug('currentValue from store for', name, 'is', currentValue);
				wrappedStore.set(currentValue);
			} else if (initialValue !== undefined) {
				console.debug('currentValue from initialValue for', name, 'is', currentValue);
				await store.set(name, initialValue);
				await store.save();
			}

			// Subscribe to changes from other windows
			const unlistener = await store.onKeyChange(name, async (newValue: T | undefined) => {
				console.debug(name, 'onKeyChange event', await store.entries());
				if (newValue === undefined) {
					console.warn(`Store value changed to undefined for ${name}, skipping update`);
					return;
				}
				if (equal(newValue, currentValue)) {
					console.debug(`Store value idempotent change for ${name}, skipping update`);
					return;
				}
				if (newValue === null) {
					console.warn(`Store value changed to null for ${name}`);
					return;
				}
				console.debug(`${name} value changed from`, currentValue, 'to', newValue);
				currentValue = newValue;
				wrappedStore.set(newValue);
			});

			getCurrentWindow().once('tauri://close-requested', unlistener);

			return store;
		} catch (e) {
			console.error(`Failed to initialize store for ${name}:`, e);
			return null;
		}
	})();

	return {
		set: (value: T) => {
			if (!equal(currentValue, value)) {
				if (value === undefined) {
					console.warn('Store for', name, 'set to undefined, skipping update');
					return;
				} else if (value === null) {
					console.warn('Store for', name, 'set to null');
				}

				currentValue = value;
				wrappedStore.set(value);

				storePromise.then(async (store) => {
					if (store) {
						await store.set(name, value);
						await store.save();
					} else {
						console.error('Store failed to initialized');
					}
				});
			}
		},
		subscribe: wrappedStore.subscribe,
		update: (updater: (value: T) => T) => {
			const newValue = updater(currentValue);
			if (!equal(currentValue, newValue)) {
				if (newValue === undefined) {
					console.warn('Store for', name, 'set to undefined, skipping update');
					return;
				} else if (newValue === null) {
					console.warn('Store for', name, 'set to null');
				}

				currentValue = newValue;
				wrappedStore.set(newValue);

				storePromise.then(async (store) => {
					if (store) {
						await store.set(name, newValue);
						await store.save();
					} else {
						console.error('Store failed to initialized');
					}
				});
			}
		}
	};
}
