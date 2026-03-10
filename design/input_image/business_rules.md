# ビジネスルール: input_image（レシート画像入力）

## 背景

家計簿の入力において、レシートの内容を手入力するのは手間がかかる。レシート画像を AI に解析させることで、日付・店名・金額・カテゴリを自動抽出し、入力の負担を軽減する。

家庭独自のカテゴリ分類（食費・日用品・除外品・くりお等）は、ユーザーがレシートに手書きした記号で判定する運用ルールがある。

## 用語集

| 用語 | 定義 |
|------|------|
| レシートデータ | AI 解析結果の構造化データ。date, payer, memo, amount, categories を持つ |
| レシートキュー | 1 画像から検出された複数レシートデータの配列 |
| カテゴリ分類記号 | ユーザーがレシートの品目横に手書きする記号（✔︎×△▲）。カテゴリを指示する |
| くりお | 犬（くりお）関連の支出。家計の精算対象から除外するためのカテゴリ |

## ルール・カタログ

### 前提条件

**IMG-01** [制約] Claude API Key が設定されていなければ画像解析を開始できない

<details><summary>実装マッピング</summary>

`index.html` — `imageInput.addEventListener('change', ...)` 内で `localStorage.getItem(API_KEY_KEY)` を確認。未設定ならエラー表示して return。

</details>

### 画像処理

**IMG-02** [制約] 画像は JPEG に圧縮し、長辺を最大 1600px に縮小してから AI 解析に送信しなければならない

> 代替案: 元画像をそのまま送信する → API コスト増加、送信時間増大のため却下

<details><summary>実装マッピング</summary>

`index.html` — `compressImage()` 関数。Canvas で縮小し `toDataURL('image/jpeg', 0.85)` で圧縮。

</details>

**IMG-13** [制約] AI 解析と Google Drive への画像アップロードは並行して実行する

> 代替案: 逐次実行する → 待ち時間が長くなるため却下

<details><summary>実装マッピング</summary>

`index.html` — `Promise.all([parseImageWithClaudeAPI(...), uploadImageToDrive(...)])` で並行実行。

</details>

### カテゴリ分類記号

**IMG-03** [導出] 手書き記号 ✔︎（チェックマーク）がついた品目は「除外8」（8%税率の除外品）に分類する

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

**IMG-04** [導出] 手書き記号 ×（バツマーク）がついた品目は「除外10」（10%税率の除外品）に分類する

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

**IMG-05** [導出] 手書き記号 △（白三角）がついた品目は「日用品」に分類する

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

**IMG-06** [導出] 手書き記号 ▲（黒三角）がついた品目は「くりお」（犬関連）とし、レシート上の税率に応じて除外8 または除外10 に分類する

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

**IMG-07** [導出] 記号がない品目は食費とし、金額は「合計 − 他カテゴリ合計」で自動算出する。categories の食費は常に null とする

> 代替案: 食費も AI に個別集計させる → 二重計算の誤差リスクがあるため却下

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` で食費を null に指示。`buildDataFromForm()` / `buildDataFromReceipt()` で `Math.max(0, total - otherCatsTotal)` として算出。

</details>

### 外食判定

**IMG-08** [導出] 飲食店のレシートであれば「外食全員」を true とする

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

### 支払者判定

**IMG-09** [導出] 支払者はレシート上部の手書き名前で判定する。「あつこ/アツコ/敦子」→ "敦子"、「なつみ/ナツミ/奈津美」→ "奈津美"、名前なし → "ひろち"（デフォルト）

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

### 日付推定

**IMG-10** [導出] 日付の年が省略されていれば今年とする。月が現在月より大きい場合は前年とする

> 代替案: 常に今年とする → 年末年始に前年のレシートを入力できなくなるため却下

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` 内のプロンプト記述で AI に指示。

</details>

### 複数レシート処理

**IMG-11** [制約] 1 画像に複数レシートが含まれる場合、レシートごとに 1 つの JSON オブジェクトとして配列で返さなければならない

<details><summary>実装マッピング</summary>

`index.html` — `imageSystemPrompt` で配列形式を指示。`parseImageWithClaudeAPI()` で単一オブジェクトの場合も配列に変換。

</details>

**IMG-12** [制約] 複数レシート検出時、レシートを 1 件ずつ確認・送信する。前後のレシートにナビゲーションで移動でき、送信後は次のレシートが自動表示される

> 代替案: まとめて一括送信する → ユーザーが個別に確認・修正できないため却下

<details><summary>実装マッピング</summary>

`index.html` — `submitData()` で現在フォームの 1 件のみ送信。送信成功後、キューに次があれば `loadReceiptFromQueue()` で表示。前後ナビは `prevReceiptButton` / `nextReceiptButton` で実装。

</details>

## 未決事項

| 項目 | 状況 | 決定方法 |
|------|------|---------|
| ▲マーク品目の税率判定基準の詳細 | レシート上の軽減税率マーク（※等）から判定と推定されるが明文化されていない | proposal で決定 |
| 画像解析失敗時のリトライ方針 | 現状はエラー表示のみ。再試行は手動 | proposal で決定 |
