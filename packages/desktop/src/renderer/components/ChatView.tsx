import { Message } from '../api/protocol'
import { MessageList } from './MessageList'
import { InputBox } from './InputBox'

interface ChatViewProps {
  messages: Message[]
  partialContent?: string
  isLoading: boolean
  onSendMessage: (content: string) => void
}

export function ChatView({ messages, partialContent, isLoading, onSendMessage }: ChatViewProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <MessageList messages={messages} partialContent={partialContent} isLoading={isLoading} />
      <InputBox onSend={onSendMessage} disabled={isLoading} />
    </div>
  )
}