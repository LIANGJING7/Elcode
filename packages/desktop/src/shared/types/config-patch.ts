import type { JSONPath } from 'jsonc-parser'

/**
 * ConfigPatch - explicit operations for JSONC modifications
 * Single source of truth for all config patch operations
 */
export type ConfigPatch =
  | { op: 'set'; path: JSONPath; value: unknown }
  | { op: 'delete'; path: JSONPath }

/**
 * ResultP - unified response structure
 */
export interface ResultP<T = void> {
  success: boolean
  data?: T
  error?: string
}