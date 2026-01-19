import { FC } from 'react'
import useExternalLinkage from './useExternalLinkage'
import { handleReceiveTextFromWsFn } from '@/features/chat/handlers'

export const WebSocketManager: FC = () => {
  // ハンドラー関数を初期化
  const handleReceiveTextFromWs = handleReceiveTextFromWsFn()

  // WebSocket関連の機能をここで初期化
  useExternalLinkage({ handleReceiveTextFromWs })

  // このコンポーネントは表示要素を持たない
  return null
}
