/**
 * Code Rendering Service.
 *
 * Unified interface for converting text to RenderLine[].
 * UI components (TextViewer, CodeBlock) use this service
 * and don't need to know about Shiki implementation.
 */

import { getHighlighter, ensureLanguage, getCurrentTheme } from './shiki'
import { detectLanguage } from '../utils/language'
import type { RenderLine, RenderToken, FileRenderModel } from '../types/render'

/** Generate stable ID for lines */
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Convert plain text to RenderLine[] (no syntax highlighting).
 *
 * Use this for files without known language or when highlighting is disabled.
 *
 * @param text - The text content
 * @param lineStart - Starting line number (default: 1)
 * @returns Array of RenderLine without tokens
 */
export function textToLines(text: string, lineStart = 1): RenderLine[] {
  return text.split('\n').map((line, i) => ({
    id: genId(),
    number: lineStart + i,
    text: line,
    tokens: undefined,
  }))
}

/**
 * Convert text to RenderLine[] with syntax highlighting.
 *
 * Uses Shiki's codeToTokens API to get token arrays per line.
 * The tokens are then converted to our RenderToken format.
 *
 * @param text - The text content
 * @param lang - The Shiki language name (e.g., 'typescript')
 * @param lineStart - Starting line number (default: 1)
 * @returns Array of RenderLine with syntax tokens
 */
export async function highlightText(
  text: string,
  lang: string,
  lineStart = 1
): Promise<RenderLine[]> {
  // Ensure language is loaded
  await ensureLanguage(lang)

  const hl = await getHighlighter()
  const theme = getCurrentTheme()

  // Use codeToTokens to get token array (not HTML)
  // Cast lang to BundledLanguage for Shiki's type requirements
  const tokensResult = hl.codeToTokens(text, { lang: lang as never, theme })

  // Split text into lines
  const lines = text.split('\n')

  // Convert to RenderLine[]
  return lines.map((lineText, i) => {
    const lineTokens = tokensResult.tokens[i]

    return {
      id: genId(),
      number: lineStart + i,
      text: lineText,
      tokens: lineTokens
        ? lineTokens.map((t) => ({
            content: t.content,
            color: t.color,
            fontStyle: t.fontStyle,
          }))
        : undefined,
    }
  })
}

/**
 * Highlight file content based on file path.
 *
 * Detects language from file path and applies syntax highlighting.
 * Falls back to plain text if language cannot be detected.
 *
 * @param filePath - The file path (for language detection)
 * @param content - The file content
 * @param lineStart - Starting line number (default: 1)
 * @returns Array of RenderLine (highlighted or plain)
 */
export async function highlightFile(
  filePath: string,
  content: string,
  lineStart = 1
): Promise<RenderLine[]> {
  const lang = detectLanguage(filePath)

  if (!lang) {
    // Unknown language - return plain text
    return textToLines(content, lineStart)
  }

  return highlightText(content, lang, lineStart)
}

/**
 * Create a FileRenderModel for TextViewer.
 *
 * This is the main entry point for TextViewer to get a renderable model.
 * It handles language detection and syntax highlighting.
 *
 * @param filePath - The file path
 * @param content - The file content
 * @param options - Optional settings
 * @returns FileRenderModel ready for rendering
 */
export async function createFileRenderModel(
  filePath: string,
  content: string,
  options?: {
    lineStart?: number
    truncated?: boolean
    wrap?: boolean
    showLineNumbers?: boolean
  }
): Promise<FileRenderModel> {
  const lineStart = options?.lineStart ?? 1
  const lines = await highlightFile(filePath, content, lineStart)

  // Extract file name and directory
  const parts = filePath.split('/')
  const fileName = parts.pop() ?? filePath
  const directory = parts.length > 0 ? parts.join('/') + '/' : undefined

  return {
    _kind: 'read',
    filePath,
    fileName,
    directory,
    lang: detectLanguage(filePath),
    lines,
    totalLines: lines.length,
    truncated: options?.truncated ?? false,
    lineStart,
    options: {
      wrap: options?.wrap ?? false,
      showLineNumbers: options?.showLineNumbers ?? true,
    },
  }
}

/**
 * Re-highlight existing RenderLine[] with a different theme.
 *
 * Used when theme changes - just re-run tokens without changing structure.
 *
 * @param lines - Existing RenderLine[] (must have tokens)
 * @param lang - The language
 * @returns Re-highlighted RenderLine[]
 */
export async function reHighlightLines(
  lines: RenderLine[],
  lang: string
): Promise<RenderLine[]> {
  if (!lines.length) return lines

  // Get the original text from lines
  const text = lines.map((l) => l.text).join('\n')
  const lineStart = lines[0].number

  return highlightText(text, lang, lineStart)
}

/**
 * Check if syntax highlighting is available for a language.
 *
 * @param lang - The language name
 * @returns true if language is known
 */
export function canHighlight(lang: string): boolean {
  return detectLanguage(lang) !== undefined
}