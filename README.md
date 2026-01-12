# 家計簿 音声入力

音声入力でGoogle スプレッドシートに家計簿データを追記するWebアプリです。

## デモ

GitHub Pagesでホストされています：
https://[your-username].github.io/kakeibo-voice/

## 機能

- 🎙️ 音声入力対応（OS標準の音声入力を使用）
- 🤖 AI補正機能（Claude API、任意）
- 📊 複数カテゴリ対応（食費、日用品、外食、除外品）
- 💰 税計算自動化（8%/10%）
- 📱 スマホ対応

## セットアップ

### 1. Google Apps Script の設定

1. [Google スプレッドシート](https://docs.google.com/spreadsheets/)を開く
2. 拡張機能 → Apps Script
3. `gas-code.js` の内容を貼り付け
4. `SPREADSHEET_ID` を自分のスプレッドシートIDに変更
5. デプロイ → 新しいデプロイ → ウェブアプリ
6. アクセスできるユーザー: 「全員」を選択
7. デプロイしてURLを取得

### 2. アプリの設定

1. アプリを開く
2. 下部の「⚙️ 設定」をクリック
3. **Google Apps Script URL**: 上記で取得したURLを入力
4. **Claude API Key**（任意）: AI補正機能を使う場合は[Anthropic Console](https://console.anthropic.com/settings/keys)から取得
5. 「設定を保存」をクリック

## 使い方

### 音声入力

- **Windows**: `Win + H` キー
- **Mac**: `Fn` キーを2回押す
- **スマホ**: キーボードのマイクアイコン

### 話し方の例

```
「今日 ひろち コンビニ 1500円 日用品300円」
「昨日 奈津美 スーパー 食費2000円」
「1月5日 敦子 ドラッグストア 合計3000円 日用品500たす300」
```

## プライバシー

- APIキーはブラウザのlocalStorageに保存され、サーバーには送信されません
- データはGoogle スプレッドシートに直接送信されます

## ライセンス

MIT License
