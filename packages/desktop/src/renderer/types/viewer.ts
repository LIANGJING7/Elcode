/**
 * Viewer Capability Types.
 *
 * Defines what features each Viewer supports.
 * ArtifactPanel (FileTabsPanel) reads these capabilities
 * to auto-generate the Toolbar (search, copy, download buttons).
 */

/**
 * Viewer capability flags.
 * Each Viewer declares its supported features.
 */
export interface ViewerCapability {
  /** Support Ctrl+F in-file search */
  search?: boolean
  /** Support copy to clipboard */
  copy?: boolean
  /** Support download/save */
  download?: boolean
  /** Support hunk/section folding (DiffViewer) */
  folding?: boolean
  /** Support line selection */
  selection?: boolean
  /** Support virtual scroll (handled internally by CodeLines) */
  virtualScroll?: boolean
  /** Support zoom (ImageViewer) */
  zoom?: boolean
}

/**
 * Default capabilities for each Viewer type.
 * Key matches the model._kind field.
 */
export const VIEWER_CAPABILITIES: Record<string, ViewerCapability> = {
  // Text file viewer
  text: {
    search: true,
    copy: true,
    virtualScroll: true, // Handled internally by CodeLines
  },

  // Diff viewer (split mode)
  diff: {
    search: true,
    folding: true,
    selection: true,
    copy: true,
  },

  // Image viewer
  image: {
    zoom: true,
    download: true,
  },

  // Grep result viewer
  grep: {
    copy: true,
  },

  // Glob result viewer
  glob: {
    copy: true,
  },

  // Web fetch result viewer
  web_fetch: {
    copy: true,
    download: true,
  },

  // Web search result viewer
  web_search: {
    copy: true,
  },

  // Unknown tool fallback
  unknown: {
    copy: true,
  },
}

/**
 * Get capabilities for a viewer type.
 * Falls back to unknown capabilities if not defined.
 */
export function getViewerCapabilities(kind: string): ViewerCapability {
  return VIEWER_CAPABILITIES[kind] ?? VIEWER_CAPABILITIES.unknown
}

/**
 * Check if a viewer supports a specific capability.
 */
export function hasCapability(kind: string, capability: keyof ViewerCapability): boolean {
  const caps = getViewerCapabilities(kind)
  return caps[capability] === true
}