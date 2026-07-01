import type { Conversation } from './ipc'

/**
 * Session list query parameters
 * Matches backend Experimental API `/experimental/session` parameters
 */
export interface SessionListQuery {
  directory?: string
  workspace?: string
  start?: number        // Unix timestamp (ms), filter time_updated >= start
  search?: string       // Title search (LIKE %search%)
  limit?: number        // Result limit, default 100
  cursor?: number       // Cursor for pagination, filter time_updated < cursor
}

/**
 * Session list result with pagination info
 */
export interface SessionListResult {
  conversations: Conversation[]
  nextCursor?: number   // Next page cursor (time_updated of last item)
}