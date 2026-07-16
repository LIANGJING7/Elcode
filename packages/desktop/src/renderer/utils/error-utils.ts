/**
 * Error handling utilities for desktop app
 */

/**
 * Check if error is a "denied" type (user rejected permission, etc.)
 */
export function isDeniedError(error: string | undefined | null): boolean {
  if (!error) return false
  return (
    error.includes("QuestionRejectedError") ||
    error.includes("rejected permission") ||
    error.includes("specified a rule") ||
    error.includes("user dismissed")
  )
}

/**
 * Extract error message from various error formats
 * Supports: string, { type, message }, { message }
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }
  return 'Unknown error'
}

/**
 * Check if error object is denied type
 */
export function isDeniedErrorObject(error: { type: string; message: string } | null | undefined): boolean {
  return isDeniedError(error?.message)
}