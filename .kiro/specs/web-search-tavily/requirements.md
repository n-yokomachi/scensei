# Requirements Document

## Introduction

Tavily Web検索をAgentCore Gateway経由でエージェントから利用可能にし、実体験データベース（香水DB）にない香水情報を補完する機能を実装する。これにより、ユーザーが質問した香水がDBに存在しない場合でも、Web検索を通じて適切な情報を提供できるようになる。

### 前提条件
- AgentCore Gateway（Phase 8）が構築済みであること
- Tavily APIキーを取得済みであること（https://tavily.com/）

### Source Reference
既存仕様: `docs/phase9/spec.md`

---

## Requirements

### Requirement 1: Credential Provider登録

**Objective:** 開発者として、Tavily APIキーをAgentCore Credential Providerに安全に登録したい。これにより、APIキーをソースコードに含めずにセキュアに管理できる。

#### Acceptance Criteria
1. When 開発者がCredential Provider作成コマンドを実行した場合, the AgentCore Gateway shall Tavily APIキー用のCredential Providerを作成する
2. The Credential Provider shall APIキーを暗号化して保存する
3. When Credential Provider作成が完了した場合, the AgentCore Gateway shall Credential ARNを返却する
4. If 無効なAPIキーが指定された場合, then the AgentCore Gateway shall エラーメッセージを表示する

---

### Requirement 2: Gateway Target設定

**Objective:** 開発者として、既存のAgentCore GatewayにTavily統合ターゲットを追加したい。これにより、エージェントがMCPプロトコル経由でWeb検索を利用できるようになる。

#### Acceptance Criteria
1. When Tavily Targetを作成する場合, the AgentCore Gateway shall 既存Gatewayに統合ターゲットとして登録する
2. The Gateway Target shall integrationType「TAVILY」を指定する
3. The Gateway Target shall Credential Provider ARNを参照する
4. When Target作成が完了した場合, the AgentCore Gateway shall MCP経由でtavily_searchツールを公開する
5. If Credential Provider ARNが無効な場合, then the AgentCore Gateway shall 設定エラーを報告する

---

### Requirement 3: エージェントツール利用

**Objective:** エージェントとして、tavily_searchツールを使用してWeb上の香水情報を検索したい。これにより、実体験DBにない香水についても情報提供できる。

#### Acceptance Criteria
1. When エージェントがAgentCore Runtimeで起動した場合, the Strands Agent shall tavily_searchツールを利用可能なツール一覧に含める
2. When エージェントがtavily_searchを呼び出した場合, the AgentCore Gateway shall Tavily APIにリクエストを転送する
3. When Tavily APIがレスポンスを返した場合, the AgentCore Gateway shall 検索結果をエージェントに返却する
4. If Tavily APIがエラーを返した場合, then the Strands Agent shall フォールバック動作（LLMの知識に基づく回答）を実行する

---

### Requirement 4: 検索優先度とフォールバック

**Objective:** エージェントとして、実体験データを優先しつつ、必要に応じてWeb検索で補完したい。これにより、信頼性の高い情報を提供できる。

#### Acceptance Criteria
1. When ユーザーが香水について質問した場合, the Strands Agent shall まずsearch_perfumes（香水DB）で検索する
2. When search_perfumesで該当データが見つからなかった場合, the Strands Agent shall tavily_searchを使用してWeb検索を実行する
3. While 実体験データが存在する場合, the Strands Agent shall Web検索結果より実体験データを優先して回答する
4. When Web検索結果を回答に含める場合, the Strands Agent shall 情報源がWeb検索であることを明示する

---

### Requirement 5: システムプロンプト更新

**Objective:** 開発者として、エージェントのシステムプロンプトにWeb検索ツールの使用ガイドラインを追加したい。これにより、エージェントが適切なタイミングでツールを使用できる。

#### Acceptance Criteria
1. The システムプロンプト shall tavily_searchツールの使用タイミングを記述する
2. The システムプロンプト shall Web検索の検索クエリ作成ガイドラインを含める
3. The システムプロンプト shall 検索結果の信頼性確認に関する注意事項を含める
4. When システムプロンプトが更新された場合, the Strands Agent shall 新しいガイドラインに従って動作する

---

## Non-Functional Requirements

### セキュリティ
- APIキーはCredential Providerで管理し、ソースコードに含めない
- Gateway経由の通信はIAM認証で保護される

### パフォーマンス
- Web検索はユーザー体験を損なわないよう、タイムアウト設定を行う
- 検索結果のキャッシュは行わない（常に最新情報を取得）

### コスト
- Tavily APIは従量課金のため、不要な検索を避けるようプロンプトで制御する

---

## Out of Scope

- Tavily以外の検索プロバイダー（Google、Bing等）への対応
- 検索結果のキャッシング機構
- 検索クエリのログ保存・分析機能
