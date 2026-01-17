import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { service } = req.query

  if (service !== 'anthropic') {
    return res.status(400).json({ error: 'Invalid service' })
  }

  // 環境変数からAPIキーを取得
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY || ''

  if (!apiKey) {
    return res.status(200).json({ hasKey: false, maskedKey: '' })
  }

  // APIキーをマスク表示（最初の8文字と最後の4文字のみ表示）
  const maskedKey =
    apiKey.length > 12
      ? `${apiKey.substring(0, 8)}${'*'.repeat(apiKey.length - 12)}${apiKey.substring(apiKey.length - 4)}`
      : '*'.repeat(apiKey.length)

  return res.status(200).json({ hasKey: true, maskedKey })
}
