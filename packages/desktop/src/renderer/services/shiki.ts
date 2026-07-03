/**
 * Shiki Highlighter Service.
 *
 * Manages a singleton Highlighter instance for the Desktop app.
 * - Loads both themes at startup (github-dark, github-light)
 * - Loads languages on-demand (not preloaded)
 * - Theme switching doesn't recreate Highlighter
 */

import { createHighlighter, type Highlighter } from 'shiki'
import { useThemeStore } from '../stores/theme'

/** Singleton highlighter instance */
let highlighter: Highlighter | null = null

/** Set of loaded languages (avoid duplicate loading) */
const loadedLanguages = new Set<string>()

/** Set of loaded themes */
const loadedThemes = new Set<string>()

/** Pending initialization promise */
let initPromise: Promise<Highlighter> | null = null

/**
 * Get or create the singleton Highlighter.
 *
 * The Highlighter is initialized with both themes loaded,
 * but languages are empty (loaded on-demand).
 */
export async function getHighlighter(): Promise<Highlighter> {
  // Return existing instance
  if (highlighter) return highlighter

  // Return pending initialization
  if (initPromise) return initPromise

  // Start initialization
  initPromise = createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [], // Empty - load on-demand
  }).then((hl) => {
    highlighter = hl
    loadedThemes.add('github-dark')
    loadedThemes.add('github-light')
    return hl
  })

  return initPromise
}

/**
 * Ensure a language is loaded.
 *
 * Loads the language into the Highlighter if not already loaded.
 * This is async because Shiki needs to fetch language definitions.
 *
 * @param lang - The Shiki language name (e.g., 'typescript', 'vue')
 */
export async function ensureLanguage(lang: string): Promise<void> {
  if (loadedLanguages.has(lang)) return

  const hl = await getHighlighter()
  try {
    // Cast to BundledLanguage - Shiki's loadLanguage accepts language names
    await hl.loadLanguage(lang as never)
    loadedLanguages.add(lang)
  } catch {
    // Language not supported by Shiki, silently ignore
    console.warn(`[shiki] Language '${lang}' not supported, falling back to plain text`)
  }
}

/**
 * Get the current code theme based on app theme.
 *
 * @returns 'github-dark' or 'github-light'
 */
export function getCurrentTheme(): 'github-dark' | 'github-light' {
  const themeStore = useThemeStore()
  return themeStore.theme === 'light' ? 'github-light' : 'github-dark'
}

/**
 * Check if the highlighter is ready.
 */
export function isReady(): boolean {
  return highlighter !== null
}

/**
 * Get list of loaded languages.
 */
export function getLoadedLanguages(): string[] {
  return Array.from(loadedLanguages)
}

/**
 * Reset the highlighter (for testing).
 *
 * @internal
 */
export function resetHighlighter(): void {
  highlighter = null
  initPromise = null
  loadedLanguages.clear()
  loadedThemes.clear()
}