# Research & Design Decisions

## Summary
- **Feature**: `web-search-tavily`
- **Discovery Scope**: Extension（既存AgentCore Gatewayへの統合拡張）
- **Key Findings**:
  - TavilyはAgentCore Gatewayのビルトイン統合として提供されている
  - ツール名は`${target_name}__${tool_name}`パターンで構成される
  - **Tavily Targetはコンソール経由でのみ追加可能**（CLI/API不可）
  - Credential ProviderはCLIで作成可能

---

## Research Log

### AgentCore Gateway ツール命名規則

- **Context**: MCP経由で公開されるツール名の形式を確認
- **Sources Consulted**:
  - [AgentCore Gateway Tool Naming](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-tool-naming.html)
- **Findings**:
  - ツール名パターン: `${target_name}__${tool_name}`
  - 例: Target名`LambdaUsingSDK` + ツール`get_order_tool` → `LambdaUsingSDK__get_order_tool`
  - Target名はカスタマイズ可能
- **Implications**:
  - Target名を`web_search`にすることで、`web_search__TavilySearchPost`という明確な名前になる
  - プロンプトにこの完全なツール名を記載する必要がある

### AgentCore Gateway Tavily統合方式

- **Context**: Tavily統合の技術的な実装方式を確認
- **Sources Consulted**:
  - [AWS AgentCore Gateway Integrations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-integrations.html)
  - [AWS Blog: Strands + Tavily](https://aws.amazon.com/blogs/machine-learning/build-dynamic-web-research-agents-with-the-strands-agents-sdk-and-tavily/)
- **Findings**:
  - Tavilyは15+の統合プロバイダーの1つとしてビルトインサポート
  - **重要**: コンソール経由でのみターゲット追加可能（CLI/APIでは不可）
  - サーバーURL: `https://api.tavily.com`
  - 認証: API Key方式
- **Implications**:
  - Credential ProviderはCLIで作成可能
  - Gateway TargetはAWS Management Console経由で手動設定が必須
  - 再現性のためにコンソール操作手順をドキュメント化する必要がある

### Tavily公開ツール

- **Context**: エージェントから利用可能なツールを特定
- **Sources Consulted**:
  - [Tavily API Reference](https://docs.tavily.com/documentation/api-reference/endpoint/search)
  - AgentCore Gateway統合ドキュメント
- **Findings**:
  | Tavily提供名 | MCP公開名（Target=web_search） | APIパス | 用途 |
  |-------------|------------------------------|--------|------|
  | TavilySearchPost | `web_search__TavilySearchPost` | POST /search | Web検索実行 |
  | TavilySearchExtract | `web_search__TavilySearchExtract` | POST /extract | Webページ抽出 |
- **Implications**: `web_search__TavilySearchPost`が香水情報検索の主要ツール

### Tavily Search APIパラメータ

- **Context**: 検索精度とパフォーマンスの最適化
- **Sources Consulted**:
  - [Tavily Search Parameters](https://help.tavily.com/articles/7879881576-optimizing-your-query-parameters)
- **Findings**:
  - `search_depth`: basic/advanced/fast/ultra-fast
  - `max_results`: 結果数制限（推奨: 5-10）
  - `topic`: general/news
  - `include_answer`: AI生成回答を含める
  - `include_domains`/`exclude_domains`: ドメイン制限
- **Implications**: 香水検索では`search_depth=basic`, `max_results=5`で十分

### Credential Provider作成方法

- **Context**: APIキーのセキュアな管理方法
- **Sources Consulted**:
  - AgentCore Gateway公式ドキュメント
- **Findings**:
  - AWS CLIコマンド:
    ```bash
    aws bedrock-agentcore-control create-api-key-credential-provider \
      --name tavily-api-key \
      --api-key "YOUR_API_KEY" \
      --description "Tavily search API integration"
    ```
  - 作成後、Credential ARNが返却される
- **Implications**: CLIで1コマンドで完了

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Console統合 | AWSコンソールからTavily Target追加 | 唯一の方法、GUI操作 | 再現性なし、IaC管理外 | **必須**（APIで不可） |
| CLI統合 | Credential ProviderのみCLIで作成 | 再現可能 | Targetは不可 | Credential用 |
| CDK拡張 | CDKスタックでカスタムリソース定義 | IaC管理 | 複雑度高、未サポート | 不採用 |

---

## Design Decisions

### Decision: Target名を`web_search`に設定

- **Context**: MCP経由で公開されるツール名を決定
- **Alternatives Considered**:
  1. `tavily` — プロバイダー名そのまま
  2. `web_search` — 用途が明確
  3. `web` — 最短
- **Selected Approach**: `web_search`を採用
- **Rationale**:
  - 用途が明確で、プロンプトで説明しやすい
  - `web_search__TavilySearchPost`は「Web検索」であることが一目瞭然
  - 将来的に別の検索プロバイダーに切り替えても、Target名を維持できる
- **Trade-offs**: やや長いが、可読性を優先
- **Follow-up**: プロンプトに正確なツール名を記載

### Decision: コンソール操作手順をドキュメント化

- **Context**: Tavily Targetがコンソール経由でのみ作成可能という制約への対応
- **Selected Approach**: 設計ドキュメントにコンソール操作手順を詳細に記載
- **Rationale**:
  - CLI/APIが利用不可のため、手順書が再現性の唯一の手段
  - スクリーンショットは不要、テキストベースの手順で十分
- **Follow-up**: 実際のコンソール操作で手順を検証

### Decision: search_depth=basicを採用

- **Context**: Tavily検索のパフォーマンスとコストバランス
- **Alternatives Considered**:
  1. advanced — 高精度だが高レイテンシ・高コスト
  2. basic — バランス良い
  3. fast/ultra-fast — 低レイテンシだが精度低下
- **Selected Approach**: `search_depth=basic`をデフォルトに
- **Rationale**:
  - 香水情報検索は一般的なWeb検索で十分
  - ユーザー体験を損なわないレイテンシ
  - コスト最適化
- **Trade-offs**: 高度な検索精度は犠牲になる
- **Follow-up**: システムプロンプトで検索クエリの質を向上

---

## Risks & Mitigations

- **Tavily API障害時** — LLMの知識で回答（基本動作として許容）
- **API料金超過** — 不要な検索を避けるプロンプト設計、max_results制限
- **検索精度不足** — 具体的なクエリ作成ガイドラインをプロンプトに含める
- **コンソール操作の再現性** — 詳細な手順書を設計ドキュメントに記載

---

## References

- [AWS Bedrock AgentCore Gateway](https://aws.amazon.com/bedrock/agentcore/) — 公式プロダクトページ
- [AgentCore Gateway Tool Naming](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-tool-naming.html) — ツール命名規則
- [Gateway Target Integrations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-integrations.html) — Tavily統合ドキュメント
- [Tavily API Documentation](https://docs.tavily.com/) — 公式APIリファレンス
- [Strands + Tavily Blog](https://aws.amazon.com/blogs/machine-learning/build-dynamic-web-research-agents-with-the-strands-agents-sdk-and-tavily/) — AWS公式ブログ
