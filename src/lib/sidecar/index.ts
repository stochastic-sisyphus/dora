import type {
    BrowseResult,
    Finding,
    RenderedContent,
    SearchResults,
    SidecarConfig
} from './types';
import {
    browseSidecar,
    extractSidecar,
    renderSidecar,
    searchSidecar
} from '$lib/app/sidecar';

/**
 * Universal search via the bundled sidecar.
 */
export async function universalSearch(
    query: string,
    config?: SidecarConfig
): Promise<SearchResults> {
    return searchSidecar(query, config);
}

/**
 * Universal extraction via the bundled sidecar.
 */
export async function universalExtract(
    content: string,
    config?: SidecarConfig
): Promise<Finding> {
    return extractSidecar(content, config);
}

/**
 * Browse a URL via the bundled sidecar.
 */
export async function browseUrl(
    url: string,
    config?: SidecarConfig
): Promise<BrowseResult> {
    return browseSidecar(url, config);
}

/**
 * Render arbitrary content (artifacts, notes, previews) via the bundled sidecar.
 */
export async function renderContent(
    content: string,
    renderType: string,
    config?: SidecarConfig
): Promise<RenderedContent> {
    return renderSidecar(content, renderType, config);
}
