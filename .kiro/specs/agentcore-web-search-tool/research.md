# Research & Design Decisions

## Summary
- **Feature**: `agentcore-web-search-tool`
- **Discovery Scope**: Extension（既存AgentCore Gateway + Strands Agentへの統合）
- **Key Findings**:
  - Tavily統合ターゲットはAWS Management Consoleのみで追加可能（CLI/API不可）
  - 既存のMCPClient統合パターンがそのまま利用でき、エージェントコードの変更は不要（ツールは自動検出）
  - Credential Providerは `create-api-key-credential-provider` CLIコマンドで作成可能

## Research Log

### AgentCore Gateway Tavily統合方式
- **Context**: TavilyをGatewayターゲットとして追加する方法を調査
- **Sources Consulted**:
  - [Gateway Target Integrations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-integrations.html)
  - [AgentCore Gateway Blog](https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-agentcore-gateway-transforming-enterprise-ai-agent-tool-development/)
- **Findings**:
  - Tavilyは15以上のビルトイン統合プロバイダーの1つ
  - サーバーURL: `https://api.tavily.com`
  - 認証方式: API Key（Credential Provider経由）
  - 提供されるツール: `TavilySearchPost`（検索）、`TavilySearchExtract`（ページ抽出）
  - ツール名はGatewayで `${target_name}__${tool_name}` パターンに変換される
  - **統合ターゲットはコンソールのみで追加可能、CLI/APIでは不可**
- **Implications**: セットアップ手順のドキュメント化が重要。再現性のため手順を明文化する

### Credential Provider CLI
- **Context**: Tavily APIキーの安全な登録方法
- **Sources Consulted**:
  - [create-api-key-credential-provider CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/bedrock-agentcore-control/create-api-key-credential-provider.html)
  - [Credential Provider Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-providers.html)
- **Findings**:
  - 必須パラメータ: `--name`（1-128文字、`[a-zA-Z0-9\-_]+`）、`--api-key`
  - 出力: `credentialProviderArn`、`apiKeySecretArn`（Secrets ManagerのARN）、`name`
  - APIキーはAWS Secrets Managerで自動暗号化保存
- **Implications**: CLI一発で完了する簡単なセットアップ

### 既存MCPClient統合パターン
- **Context**: 既存のGateway接続コードとの互換性を確認
- **Sources Consulted**: `agentcore/app.py`、`agentcore/src/agent/scensei_agent.py`
- **Findings**:
  - `create_mcp_client()` → IAM認証のStreamable HTTP transport
  - `app.py`で`mcp_client.list_tools_sync()`を呼び出し、取得したツールを`Agent(tools=mcp_tools)`に渡す
  - Tavily Targetを追加すれば、既存コードで自動的にツールが検出される
  - エージェントコードの変更は**不要**（`list_tools_sync()`が新しいツールを含めて返す）
- **Implications**: コード変更はシステムプロンプトのみ。インフラ設定がメイン

### Strands Agents MCPClient
- **Context**: MCPClientのツール取得・利用パターンの確認
- **Sources Consulted**:
  - [Strands Agents MCP Tools Documentation](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/mcp-tools/)
  - [MCPClient API Reference](https://strandsagents.com/latest/documentation/docs/api-reference/python/tools/mcp/mcp_client/)
- **Findings**:
  - MCPClientはcontext manager内で`list_tools_sync()`を呼び、結果をAgentに渡す
  - ツール一覧はGateway側で管理、クライアント側は自動検出するのみ
  - 新しいTargetをGatewayに追加するだけでツールが増える
- **Implications**: 既存パターンをそのまま活用可能

## Design Decisions

### Decision: エージェントコード変更の範囲
- **Context**: Tavily Web検索ツール追加に伴うコード変更範囲の決定
- **Alternatives Considered**:
  1. システムプロンプトのみ変更 — ツールの使い方ガイドラインを追加
  2. scensei_agent.pyも変更 — ツールフィルタリングやcustom tool wrapperを追加
- **Selected Approach**: システムプロンプトのみ変更
- **Rationale**: MCPClientが`list_tools_sync()`で全ツールを自動取得するため、Pythonコードの変更は不要。LLMがツールを適切に使うよう、プロンプトでガイドラインを提供するだけで十分
- **Trade-offs**: ツールの使用制御がプロンプトベースのため、完全な制御は難しい。ただし現状のsearch_perfumesも同じアプローチで問題なく動作している

### Decision: ツール命名
- **Context**: Gateway上でのTavilyツール名の決定
- **Selected Approach**: Target名を `web_search` とし、MCP公開名を `web_search__TavilySearchPost` にする
- **Rationale**: 既存の`search_perfumes`と区別でき、用途が明確。Gatewayの命名規則 `${target_name}__${tool_name}` に準拠

## Risks & Mitigations
- コンソール手動設定の再現性 → セットアップ手順を詳細にドキュメント化
- Tavily APIのレート制限 → プロンプトで不要な検索を抑制、search_perfumes優先ルール
- APIキーの漏洩リスク → Credential Provider + Secrets Managerで暗号化管理

## References
- [AgentCore Gateway Target Integrations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-integrations.html)
- [create-api-key-credential-provider CLI](https://docs.aws.amazon.com/cli/latest/reference/bedrock-agentcore-control/create-api-key-credential-provider.html)
- [Strands Agents MCP Tools](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/mcp-tools/)
- [Tavily API Documentation](https://docs.tavily.com/)
- [AgentCore Gateway Blog](https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-agentcore-gateway-transforming-enterprise-ai-agent-tool-development/)
