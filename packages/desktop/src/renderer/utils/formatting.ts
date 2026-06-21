import { format, formatDistanceToNow } from 'date-fns'

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'h:mm a')
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function formatCodeBlock(code: string, language: string): string {
  const trimmed = code.trim()
  return trimmed
}

export function generateTitle(content: string): string {
  const firstLine = content.split('\n')[0]
  return truncateText(firstLine, 30)
}