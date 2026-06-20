import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react'

interface InputBoxProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function InputBox({ 
  onSend, 
  disabled = false, 
  placeholder = 'Type a message...' 
}: InputBoxProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const isDisabled = disabled || !value.trim()

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-gray-700 text-gray-100 border border-gray-800 rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-gray-600 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: '200px' }}
          />
          <div className="absolute right-3 bottom-2 text-xs text-gray-500 pointer-events-none">
            Enter to send, Shift+Enter for new line
          </div>
        </div>
        <button
          type="submit"
          disabled={isDisabled}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  )
}