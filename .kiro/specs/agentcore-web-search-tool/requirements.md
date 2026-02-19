# Requirements Document

## Introduction

Amazon Bedrock AgentCore Gatewayを使用してTavilyのWeb検索ツールをエージェントに追加する。これにより、Scenseiエージェントが実体験データベース（香水DB）にない香水情報をWeb検索で補完し、より幅広い質問に対応できるようになる。

### 前提条件
- AgentCore Gateway（Phase 8）が構築済みであること
- Tavily APIキーを取得済みであること（https://tavily.com/）
- AWS CLIが使用可能であること

### 参考仕様
既存spec: `.kiro/specs/web-search-tavily/`（設計フェーズまで完了）

## Requirements

### Requirement 1: Tavily APIキーのCredential Provider登録

**Objective:** As a 開発者, I want Tavily APIキーをAgentCore Credential Providerに安全に登録したい, so that APIキーをソースコードに含めずにセキュアに管理できる

#### Acceptance Criteria
1. When 開発者がCLIコマンドを実行した場合, the AgentCore shall Tavily APIキー用のCredential Providerを作成する
2. The Credential Provider shall APIキーをAWS Secrets Manager経由で暗号化して保存する
3. When Credential Provider作成が完了した場合, the AgentCore shall credentialProviderArnを返却する
4. If 無効なパラメータが指定された場合, then the AgentCore shall エラーメッセージを返却する

### Requirement 2: AgentCore GatewayへのTavily統合ターゲット追加

**Objective:** As a 開発者, I want 既存のAgentCore GatewayにTavily統合ターゲットを追加したい, so that エージェントがMCPプロトコル経由でWeb検索を利用できるようになる

#### Acceptance Criteria
1. When Tavily統合ターゲットをGatewayに追加した場合, the AgentCore Gateway shall MCP経由でTavilySearchPostツールを公開する
2. The Gateway Target shall Credential Providerを参照してTavily APIキーで認証する
3. When ターゲット追加が完了した場合, the AgentCore Gateway shall tools/listでweb_search__TavilySearchPostツールが確認可能になる
4. The Gateway Target shall AWS Management Console経由で設定する（CLI/APIでは作成不可）

### Requirement 3: エージェントからのWeb検索ツール利用

**Objective:** As a Scenseiエージェント, I want web_search__TavilySearchPostツールを使用してWeb上の香水情報を検索したい, so that 実体験DBにない香水についても情報提供できる

#### Acceptance Criteria
1. When エージェントがAgentCore Runtimeで起動した場合, the Strands Agent shall web_search__TavilySearchPostツールを利用可能なツール一覧に含める
2. When エージェントがweb_search__TavilySearchPostを呼び出した場合, the AgentCore Gateway shall Tavily APIにリクエストを転送し検索結果を返却する
3. If Tavily APIがエラーを返した場合, then the Strands Agent shall LLMの知識に基づくフォールバック回答を実行する

### Requirement 4: 検索優先度の制御

**Objective:** As a Scenseiエージェント, I want 実体験データを優先しつつ必要に応じてWeb検索で補完したい, so that 信頼性の高い情報を提供できる

#### Acceptance Criteria
1. When ユーザーが香水について質問した場合, the Strands Agent shall まずsearch_perfumes（香水DB）で検索する
2. When search_perfumesで該当データが見つからなかった場合, the Strands Agent shall web_search__TavilySearchPostを使用してWeb検索を実行する
3. While 実体験データが存在する場合, the Strands Agent shall Web検索結果より実体験データを優先して回答する
4. When Web検索結果を回答に含める場合, the Strands Agent shall 情報源がWeb検索であることを明示する

### Requirement 5: システムプロンプトへのWeb検索ガイドライン追加

**Objective:** As a 開発者, I want エージェントのシステムプロンプトにWeb検索ツールの使用ガイドラインを追加したい, so that エージェントが適切なタイミングと方法でツールを使用できる

#### Acceptance Criteria
1. The システムプロンプト shall web_search__TavilySearchPostツールの使用タイミングを記述する
2. The システムプロンプト shall 検索クエリ作成のガイドライン（具体的なブランド名・商品名を含めるなど）を含める
3. The システムプロンプト shall Web検索結果の信頼性に関する注意事項と情報源明示ルールを含める

## Non-Functional Requirements

### セキュリティ
- APIキーはCredential Providerで管理し、ソースコードに含めない
- Gateway経由の通信はIAM認証で保護される

### コスト
- Tavily APIは従量課金のため、不要な検索を避けるようプロンプトで制御する

## Out of Scope

- Tavily以外の検索プロバイダー（Google、Bing等）への対応
- 検索結果のキャッシング機構
- 検索クエリのログ保存・分析機能
- TavilySearchExtract（Webページ抽出）の利用（将来的に検討）
