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

- AWSアカウント（Bedrock利用可能、Claude Sonnet 4へのアクセス有効化済み）
- Python 3.10以上
- AWS CLI設定済み（デフォルトリージョン: us-west-2 推奨）
- 適切なIAMパーミッション

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
uv add strands-agents strands-agents-tools bedrock-agentcore
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
├── app.py                      # AgentCore Runtime エントリポイント
├── pyproject.toml
└── README.md
```

#### 環境変数

```bash
# backend/.env
AWS_REGION=us-west-2
AWS_PROFILE=default  # または適切なプロファイル
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
from strands.models import BedrockModel
from .prompts import SCENSEI_SYSTEM_PROMPT

def create_scensei_agent() -> Agent:
    """Scenseiエージェントを作成"""
    # Bedrock経由でClaudeを使用
    bedrock_model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
        streaming=True
    )

    agent = Agent(
        model=bedrock_model,
        system_prompt=SCENSEI_SYSTEM_PROMPT,
        # Phase 7以降でtools追加予定
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

#### Starter Toolkit を使ったデプロイ（推奨）

```bash
# Starter Toolkit インストール
pip install bedrock-agentcore-starter-toolkit
```

#### エントリポイント作成

```python
# backend/app.py

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from src.agent.scensei_agent import create_scensei_agent
from src.tools.emotion_parser import parse_emotion_tags

app = BedrockAgentCoreApp()
agent = create_scensei_agent()

@app.entrypoint
def invoke(prompt: str) -> dict:
    """エージェント呼び出しエントリポイント"""
    response = agent(prompt)

    # レスポンスからテキストを抽出
    response_text = str(response)

    # 感情タグをパース
    clean_text, segments = parse_emotion_tags(response_text)

    return {
        "text": clean_text,
        "segments": segments,
        "raw": response_text
    }

if __name__ == "__main__":
    # ローカルテスト用（ポート8080で起動）
    app.run(port=8080)
```

#### デプロイ手順

```bash
cd backend

# 設定（対話形式）
agentcore configure -e app.py

# デプロイ（direct_code_deploy モード、Docker不要）
agentcore deploy

# エンドポイント確認
agentcore describe
```

#### 動作確認

```bash
# CLIからテスト
agentcore invoke '{"prompt": "こんにちは！夏におすすめの香水を教えて"}'
```

#### プログラムからの呼び出し

```python
import boto3

client = boto3.client('bedrock-agentcore-runtime', region_name='us-west-2')

response = client.invoke_agent(
    agentRuntimeName='scensei-agent',
    input={'prompt': 'こんにちは'}
)

print(response['output'])
```

---

### 5.4 Next.js連携

#### API Route作成

```typescript
// src/pages/api/ai/agentcore.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { BedrockAgentCoreRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agentcore-runtime'

const client = new BedrockAgentCoreRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message } = req.body

    const command = new InvokeAgentCommand({
      agentRuntimeName: process.env.AGENTCORE_RUNTIME_NAME || 'scensei-agent',
      input: { prompt: message },
    })

    const response = await client.send(command)

    // レスポンスをパースしてフロントエンド用に変換
    const output = JSON.parse(response.output || '{}')

    return res.status(200).json({
      text: output.text,
      segments: output.segments,
    })
  } catch (error) {
    console.error('AgentCore API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
```

#### 環境変数追加

```bash
# .env.local
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AGENTCORE_RUNTIME_NAME=scensei-agent
```

#### AWS SDK インストール

```bash
npm install @aws-sdk/client-bedrock-agentcore-runtime
```

---

## テスト項目

### ローカル動作確認

- [ ] Pythonプロジェクトがビルドできる
- [ ] `python -m src.agent.scensei_agent` でローカル動作確認
- [ ] 感情タグが正しく含まれる
- [ ] 日本語が正しく処理される

### AgentCore Runtime

- [ ] `agentcore deploy` が成功する
- [ ] `agentcore describe` でエンドポイント確認
- [ ] `agentcore invoke` でテスト成功
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

- [Strands Agents 公式ドキュメント](https://strandsagents.com/latest/)
- [Strands Agents Python SDK](https://github.com/strands-agents/sdk-python)
- [Strands + AgentCore デプロイガイド](https://strandsagents.com/latest/documentation/docs/user-guide/deploy/deploy_to_bedrock_agentcore/)
- [AgentCore Starter Toolkit クイックスタート](https://aws.github.io/bedrock-agentcore-starter-toolkit/user-guide/runtime/quickstart.html)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [AgentCore サンプル集](https://github.com/awslabs/amazon-bedrock-agentcore-samples)

---

## 備考

- Phase 5完了後、フロントエンドの直接Claude呼び出しはAgentCore経由に切り替え
- ツール機能（香水検索、Web検索）はPhase 7で追加
- 記憶機能（セッション管理、ユーザープロファイル）はPhase 6で追加
- 現時点ではstreaming対応は見送り（Phase 9で検討）
- AgentCore Runtimeは現在Preview（us-west-2, us-east-1, ap-southeast-2, eu-central-1で利用可能）

---

## 技術的な注意点

### インポートパス
- パッケージ名: `strands-agents`
- インポート: `from strands import Agent`
- Bedrockモデル: `from strands.models import BedrockModel`

### 認証
- AgentCore RuntimeはIAM認証（SigV4）を使用
- AWS SDKを使用する場合、IAM credentialsが必要
- Starter ToolkitはAWS CLIの設定を自動利用

### デプロイモード
- `direct_code_deploy`（推奨）: Docker不要、CodeBuild経由でデプロイ
- `container`: Docker/ECRを使用したカスタムデプロイ

### 会話履歴
- 現時点ではステートレス（各リクエストが独立）
- Phase 6でAgentCore Memoryを導入し、セッション管理を実装
