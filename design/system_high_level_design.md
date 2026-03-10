# システムハイレベルデザイン: kakeivoice（家計簿 音声入力）

## システム概要

家庭の家計簿データを音声入力・レシート画像から Google スプレッドシートに記録する Web アプリケーション。精算ダッシュボードで月別・人別の精算結果を確認できる。

## テナント構造

シングルテナント（1家庭用）。設定（GAS URL、Claude API Key、シート名）はブラウザの localStorage に保存される。

## API 構造

### クライアント → GAS（Google Apps Script）

GAS の Web アプリとして公開。認証なし（全員アクセス可）。

| メソッド | パラメータ | 用途 |
|---------|-----------|------|
| GET | `?data={JSON}` | スプレッドシートにデータ追記 |
| GET | `?action=readSummary` | サマリーシートのデータ読み取り |
| POST | JSON body | データ追記（GET の代替） |
| POST | `action=uploadImage` | レシート画像を Google Drive にアップロード |

### クライアント → Claude API

ブラウザから直接 `https://api.anthropic.com/v1/messages` を呼び出す。API Key は localStorage から取得。

| 用途 | モデル | 入力 | 出力 |
|------|--------|------|------|
| 音声テキスト補正 | claude-sonnet | テキスト | 構造化 JSON |
| レシート画像解析 | claude-sonnet | 画像 + プロンプト | 構造化 JSON 配列 |

## ケイパビリティ一覧

| ケイパビリティ | 概要 | 状態 |
|--------------|------|------|
| `voice_input` | 音声テキスト → AI 補正 → フォーム → スプレッドシート追記 | 実装済み・未定義 |
| `input_image` | レシート画像 → AI 解析 → フォーム → スプレッドシート追記 | 実装済み・定義済み |
| `settlement_dashboard` | サマリーシート → 月別・人別精算ダッシュボード | 実装済み・未定義 |

## コード探索ガイド

### フレームワーク・言語

- HTML / JavaScript（ブラウザネイティブ、ビルドツール・パッケージ管理なし）
- Google Apps Script（サーバーサイド）
- フレームワーク未使用（Vanilla JS）

### ディレクトリ構成

```
kakeivoice/
├── index.html          … メインアプリ（音声入力・画像入力・フォーム・設定）
├── dashboard.html      … 精算ダッシュボード
├── gas-code.js         … GAS サーバーサイドコード（スプレッドシート操作・Drive アップロード）
├── .env / .env.example … 環境変数（GAS URL、Claude API Key）
├── design/             … miko ドキュメント
└── README.md
```

フラット構成。全てのクライアントコードは HTML ファイル内の `<script>` タグに記述されている。

### レイヤー構成と責務

| レイヤー | 責務 | 置き場 | 探索方法 |
|---------|------|--------|---------|
| UI | フォーム表示、ユーザー操作ハンドリング | `index.html` の HTML 部分 | HTML 要素の `id` で検索 |
| クライアントロジック | 入力解析、税計算、データ構築、API 呼び出し | `index.html` の `<script>` 内の関数群 | 関数名で Grep |
| AI 連携 | Claude API 呼び出し（補正・画像解析） | `index.html` 内の `callClaudeAPI()`, `parseImageWithClaudeAPI()` | 関数名で検索 |
| ダッシュボード | サマリーデータ取得・表示・列マッピング | `dashboard.html` の `<script>` 内 | `dashboard.html` を直接参照 |
| GAS サーバー | スプレッドシート読み書き、Drive 操作 | `gas-code.js` | ファイル全体を参照 |

### ファイル命名規約

- HTML ファイル: ケバブケース（`index.html`, `dashboard.html`）
- JavaScript 関数: キャメルケース（`submitData`, `buildDataFromReceipt`）
- DOM 要素 ID: キャメルケース（`inputDate`, `submitButton`, `receiptQueueBadge`）
- localStorage キー: スネークケース風の定数（`kakeibo_gas_url`, `kakeibo_api_key`）

### ビジネスルール抽出の着目点

| 着目点 | このプロジェクトでの表現 | 探索方法 |
|--------|----------------------|---------|
| カテゴリ分類ルール | AI プロンプト内のテキスト記述（`imageSystemPrompt`, `systemPrompt`） | `index.html` 内で `systemPrompt` や `カテゴリ` を Grep |
| 税計算ロジック | `calcTax()` 関数、税込/税抜切替の `taxType` セレクト | `calcTax`, `taxRate` で Grep |
| データマッピング（列配置） | `gas-code.js` の `processData()` 内の `row[]` 配列 | `processData` 関数を直接参照 |
| 導出値の計算 | `食費 = 合計 - 他カテゴリ合計` 等 | `categories['食費']` で Grep |
| 支払者判定 | AI プロンプト内のルール、フォームのデフォルト値 | `payer` で Grep |
| フォームバリデーション | `validateForm()` 関数 | 関数名で検索 |
| 複数レシート処理 | `receiptQueue` 配列、`buildDataFromReceipt()` | `receiptQueue` で Grep |
| 日付推定ロジック | AI プロンプト内の年・月判定ルール | プロンプト内の `日付` 記述を参照 |
