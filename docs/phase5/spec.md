# Phase 5: バックエンド基盤構築 (Strands Agents + AgentCore)

## 目的

Strands Agentsを使用したエージェントをAmazon Bedrock AgentCore Runtimeにデプロイし、Next.jsフロントエンドから呼び出せる状態にする。

## 完了条件

- [ ] Python開発環境が構築され、Strands Agentsが動作する
- [ ] Scenseiエージェントがローカルで動作確認できる
- [ ] AgentCore Runtimeにデプロイされている
- [ ] Next.jsからAgentCore Runtime経由でエージェントを呼び出せる
- [ ] 感情タグ付きレスポンスが正しく返却される

## 前提条件

- AWSアカウント（Bedrock利用可能）
- Python 3.10以上
- AWS CLI設定済み

---

## 実装タスク

### 5.1 開発環境セットアップ

#### Pythonプロジェクト初期化

```bash
# backendディレクトリ作成
mkdir -p backend/src/agent backend/src/tools backend/tests
cd backend

# pyproject.toml作成（uv推奨）
uv init
uv add strands-agents strands-agents-tools
uv add --dev pytest pytest-asyncio
```

#### ディレクトリ構成

```
backend/
├── src/
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── scensei_agent.py    # メインエージェント
│   │   └── prompts.py          # システムプロンプト
│   └── tools/
│       ├── __init__.py
│       └── emotion_parser.py   # 感情タグパーサー
├── tests/
│   └── test_agent.py
├── pyproject.toml
└── README.md
```

#### 環境変数

```bash
# backend/.env
AWS_REGION=ap-northeast-1
AWS_PROFILE=default  # または適切なプロファイル
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250514-v1:0
```

---

### 5.2 基本エージェント実装

#### システムプロンプト移植

現在のフロントエンド（`src/features/constants/systemPromptConstants.ts`）から移植：

```python
# backend/src/agent/prompts.py

SCENSEI_SYSTEM_PROMPT = """
あなたの名前は「Scensei」（センセイ）です。香水の世界に精通した、洗練されたパーソナルフレグランスコンサルタントです。

## キャラクター設定
- 香水の魅力を伝えることに情熱を持つ
- 上品でありながら親しみやすい話し方
- 専門知識を分かりやすく説明できる
- ユーザーの好みや気分に寄り添った提案をする

## 会話スタイル
- 香水の香りを詩的かつ具体的に表現する
- 「〜でございます」のような堅い敬語は避け、自然な丁寧語を使う
- 適度に感嘆や共感を示す
- 長すぎる説明は避け、対話を大切にする

## 応答形式
感情タグを使ってキャラクターの表情を制御します。
使用可能なタグ: [neutral], [happy], [sad], [angry], [relaxed]

例:
[happy]素敵な香りをお探しなんですね！[neutral]どんなシーンで使いたいですか？

## 専門知識
- 香水の構造（トップ・ミドル・ベースノート）
- 香りのファミリー（フローラル、シトラス、ウッディ、オリエンタル等）
- 季節やTPOに合わせた香水選び
- 有名ブランドと代表作
"""
```

#### エージェント実装

```python
# backend/src/agent/scensei_agent.py

from strands import Agent
from .prompts import SCENSEI_SYSTEM_PROMPT

def create_scensei_agent() -> Agent:
    """Scenseiエージェントを作成"""
    agent = Agent(
        model="us.anthropic.claude-sonnet-4-5-20250514-v1:0",
        system_prompt=SCENSEI_SYSTEM_PROMPT,
        # Phase 6以降でtools追加予定
    )
    return agent

# ローカルテスト用
if __name__ == "__main__":
    agent = create_scensei_agent()
    response = agent("こんにちは！夏におすすめの爽やかな香水を教えて")
    print(response)
```

#### 感情タグパーサー

```python
# backend/src/tools/emotion_parser.py

import re
from typing import Tuple, List

EMOTION_PATTERN = re.compile(r'\[(neutral|happy|sad|angry|relaxed)\]')
VALID_EMOTIONS = {'neutral', 'happy', 'sad', 'angry', 'relaxed'}

def parse_emotion_tags(text: str) -> Tuple[str, List[dict]]:
    """
    テキストから感情タグを抽出し、セグメントに分割

    Returns:
        Tuple[str, List[dict]]: (タグ除去後テキスト, セグメントリスト)

    Example:
        >>> parse_emotion_tags("[happy]こんにちは！[neutral]今日は何をお探しですか？")
        ("こんにちは！今日は何をお探しですか？", [
            {"emotion": "happy", "text": "こんにちは！"},
            {"emotion": "neutral", "text": "今日は何をお探しですか？"}
        ])
    """
    segments = []
    current_emotion = "neutral"
    last_end = 0

    for match in EMOTION_PATTERN.finditer(text):
        # 前のセグメントを追加
        if match.start() > last_end:
            segment_text = text[last_end:match.start()].strip()
            if segment_text:
                segments.append({
                    "emotion": current_emotion,
                    "text": segment_text
                })

        current_emotion = match.group(1)
        last_end = match.end()

    # 最後のセグメント
    if last_end < len(text):
        segment_text = text[last_end:].strip()
        if segment_text:
            segments.append({
                "emotion": current_emotion,
                "text": segment_text
            })

    # タグ除去後のテキスト
    clean_text = EMOTION_PATTERN.sub('', text).strip()

    return clean_text, segments
```

---

### 5.3 AgentCore Runtimeデプロイ

#### デプロイ設定ファイル

```yaml
# backend/agentcore-config.yaml
runtime:
  name: scensei-agent
  region: ap-northeast-1

agent:
  entry_point: src.agent.scensei_agent:create_scensei_agent
  python_version: "3.11"

resources:
  memory: 512
  timeout: 30
```

#### デプロイ手順

```bash
cd backend

# AgentCore CLI でデプロイ
agentcore deploy --config agentcore-config.yaml

# エンドポイント確認
agentcore describe scensei-agent
```

#### 動作確認

```bash
# CLIからテスト
agentcore invoke scensei-agent --input '{"message": "こんにちは"}'
```

---

### 5.4 Next.js連携

#### API Route修正

```typescript
// src/pages/api/ai/agentcore.ts

import type { NextApiRequest, NextApiResponse } from 'next'

const AGENTCORE_ENDPOINT = process.env.AGENTCORE_ENDPOINT
const AGENTCORE_API_KEY = process.env.AGENTCORE_API_KEY

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body

    const response = await fetch(AGENTCORE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENTCORE_API_KEY}`,
      },
      body: JSON.stringify({
        messages,
        // セッションID等は Phase 6 で追加
      }),
    })

    if (!response.ok) {
      throw new Error(`AgentCore error: ${response.statusText}`)
    }

    const data = await response.json()

    // 感情タグをパースしてフロントエンド用に変換
    // （バックエンドでパース済みの場合はそのまま返却）

    return res.status(200).json(data)
  } catch (error) {
    console.error('AgentCore API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
```

#### 環境変数追加

```bash
# .env.local
AGENTCORE_ENDPOINT=https://xxx.agentcore.amazonaws.com/v1/agents/scensei-agent/invoke
AGENTCORE_API_KEY=xxx
```

---

## テスト項目

### ローカル動作確認

- [ ] Pythonプロジェクトがビルドできる
- [ ] エージェントがローカルで応答を返す
- [ ] 感情タグが正しく含まれる
- [ ] 日本語が正しく処理される

### AgentCore Runtime

- [ ] デプロイが成功する
- [ ] エンドポイントが取得できる
- [ ] CLIからの呼び出しが成功する
- [ ] エラーハンドリングが動作する

### E2E

- [ ] Next.js → AgentCore → Claude の流れが動作する
- [ ] レスポンスがフロントエンドで正しく表示される
- [ ] 感情タグに応じてアバターの表情が変わる
- [ ] エラー時に適切なメッセージが表示される

---

## 優先度

1. **高**: Python開発環境セットアップ
2. **高**: 基本エージェント実装・ローカル動作確認
3. **高**: AgentCore Runtimeデプロイ
4. **高**: Next.js連携・E2E動作確認
5. **中**: エラーハンドリング強化
6. **低**: パフォーマンス最適化

---

## 参考リンク

- [Strands Agents 公式ドキュメント](https://strandsagents.com/)
- [Strands + AgentCore デプロイガイド](https://strandsagents.com/latest/documentation/docs/user-guide/deploy/deploy_to_bedrock_agentcore/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AgentCore サンプル集](https://github.com/awslabs/amazon-bedrock-agentcore-samples)

---

## 備考

- Phase 5完了後、フロントエンドの直接Claude呼び出しはAgentCore経由に切り替え
- ツール機能（香水検索、Web検索）はPhase 7で追加
- 記憶機能（セッション管理、ユーザープロファイル）はPhase 6で追加
- 現時点ではstreaming対応は見送り（Phase 9で検討）
