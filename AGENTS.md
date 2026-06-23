<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Next.js 実装ルール

## コーディングエージェント準備: shadcn/ui

- `.agent/skills/shadcn` が存在しない場合は、`bunx --bun skills add shadcn/ui` を実行して導入してください。
- `.mcp.json` に以下のMCPサーバーが登録されていない場合は追加してください。
  ```json
  {
    "mcpServers": {
      "shadcn": {
        "command": "bunx",
        "args": ["shadcn@latest", "mcp"]
      }
    }
  }
  ```

## コーディング規約

- **コメント**: コードコメントは原則として日本語で記述します。
- **型定義**:
  - `any`型の使用は禁止します。
  - 型は可能な限り厳密に定義します。
- **ESLint**:
  - `eslint-disable`の使用は原則禁止です。どうしても使用が必要な場合は、理由を説明した上で、特定のルールに限定して（例: `eslint-disable-next-line no-explicit-any`）使用してください。
- UIは必ず、shacn/uiのMCPサーバーのレジストリを介して、shacn/uiのコンポーネントをインストールして利用する。
- `components.json` の `registries` に登録されている外部レジストリ（例: `@shadcnhooks`, `@diceui` など）にある便利なコンポーネントやフックも、積極的に調査・活用すること。
- 憶測に基づいて判断・行動しないこと。不明な点や確証がない場合は必ず調査または確認を行うこと。
- `grep` 等で検索を行う際は、`.next` や `node_modules` ディレクトリを必ず除外すること。
- シェルコマンドで括弧（`(` や `)`）を含むパスを扱う際は、必ずパス全体をダブルクォーテーションで囲むこと（例: `git add "app/(authenticated)/..."`）。
- コード修正・追加・削除後は必ず下記を実行し、品質を保証する。
  - `prettier --write "**/*.{ts,tsx,css,md,html,json}" --log-level warn`
  - `tsc --noEmit`
  - `eslint`

## Gitコミットルール

コミットメッセージは以下のフォーマットに従い、**日本語**で記述してください。
コミットとプッシュはユーザーからの指示があった場合にのみ行う。

```
<プレフィックス>: <タイトル>

[本文（必要な場合）]
```

### プレフィックス

- **feat**: 新機能の追加
- **fix**: バグ修正
- **docs**: ドキュメントのみの変更
- **style**: コードの動作に影響しない変更（空白、フォーマットなど）
- **refactor**: バグ修正や機能追加を含まないコードの変更（リファクタリング）
- **perf**: パフォーマンスを向上させるコードの変更
- **test**: テストの追加や既存のテストの修正
- **chore**: ビルドプロセスやツールの変更、ライブラリの更新など
