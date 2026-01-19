import { Message } from '@/features/messages/messages'
import { getVercelAIChatResponseStream } from './vercelAIChat'

export async function getAIChatResponseStream(
  messages: Message[]
): Promise<ReadableStream<string> | null> {
  return getVercelAIChatResponseStream(messages)
}
