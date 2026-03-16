// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare const APP_VERSION: string;
declare const APP_BUILD_HASH: string;
declare const DEFAULT_WEBUI_URL: string;

declare global {
	interface EventTarget {
		style?: any;
		value?: any;
		scrollHeight?: number;
		scrollTop?: number;
		clientHeight?: number;
		files?: FileList | null;
		click?: () => void;
		contentWindow?: Window | null;
		setSelectionRange?: (start: number, end: number) => void;
		srcObject?: MediaStream | null;
		play?: () => Promise<void>;
		getContext?: (contextId: string) => any;
		closest?: (selector: string) => Element | null;
	}

	interface Element {
		click?: () => void;
	}

	interface HTMLElement {
		value?: any;
		files?: FileList | null;
		videoWidth?: number;
		videoHeight?: number;
	}

	interface HTMLInputElement {
		directory?: boolean;
		webkitdirectory?: boolean;
	}

	interface HTMLIFrameElement {
		msRequestFullscreen?: () => Promise<void>;
		webkitRequestFullscreen?: () => Promise<void>;
	}

	interface CustomEvent<T = any> {
		key?: string;
		shiftKey?: boolean;
		keyCode?: number;
		metaKey?: boolean;
		ctrlKey?: boolean;
		clipboardData?: DataTransfer | null;
	}

	interface Navigator {
		msMaxTouchPoints?: number;
	}

	interface SpeechSynthesisVoice {
		id?: string;
	}

	interface Document {
		pyodideMplTarget?: any;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

declare module 'svelte' {
	export function getContext<T = any>(key: any): T;
}

export {};
