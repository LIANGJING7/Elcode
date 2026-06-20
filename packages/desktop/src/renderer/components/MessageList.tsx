import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../api/protocol'

interface MessageListProps {
  messages: Message[]
  partialContent?: string
  isLoading: boolean
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

export function MessageList({ messages, partialContent, isLoading }: MessageListProps) {
  const listRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages or partial content arrives
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, partialContent])

  // Format timestamp as HH:MM
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            <div className="prose prose-sm prose-invert max-w-none dark:prose-invert">
              {message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : message.isPartial ? (
                <LoadingDots />
              ) : null}
            </div>
            <div
              className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
              }`}
            >
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}

      {/* Streaming partial content */}
      {partialContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <div className="prose prose-sm prose-invert max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {partialContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator when no partial content */}
      {isLoading && !partialContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <LoadingDots />
          </div>
        </div>
      )}
    </div>
  )
}