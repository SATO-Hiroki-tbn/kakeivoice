// Google Apps Script - スプレッドシートに音声入力データを追記
// 
// 【セットアップ手順】
// 1. Google スプレッドシートを開く
// 2. 拡張機能 → Apps Script
// 3. このコードを貼り付けて保存
// 4. デプロイ → 新しいデプロイ → ウェブアプリ
// 5. アクセスできるユーザー: 「全員」を選択
// 6. デプロイしてURLを取得

const SPREADSHEET_ID = '1xGXb5XiZbM-7KxMDdjn98mBr-wwEXJxk1dNvVzKr5Jo';
const SHEET_NAME = '2025';

function doGet(e) {
  // GETリクエストでもデータを処理（スマホ対応）
  try {
    if (e.parameter && e.parameter.data) {
      const data = JSON.parse(e.parameter.data);
      return processData(data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ready', message: 'データを送信してください' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return processData(data);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function processData(data) {
  // シート名をdataから取得、なければデフォルト値を使用
  const sheetName = data.sheetName || SHEET_NAME;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  // データを適切な列に配置（B列から開始）
  // B: 支払者, C: 日付, D: 金額計(税込)
  // E: 外食-家族全員, F: 外食-家族一部
  // G: 日用品10%(税抜), H: 外税, I: ?, J: ?, K: 日用品小計
  // L: 除外8%(税抜), M: 外税, N: 除外10%(税抜), O: 外税, P: 除外小計
  // Q: 食費(税込), R: メモ(用途)
  const row = [];
  
  // 税抜・外税を計算する関数
  function calcTax(total, rate) {
    const taxExcluded = Math.round(total / (1 + rate));
    const tax = total - taxExcluded;
    return { taxExcluded, tax };
  }
  
  // 複数カテゴリ対応: categoriesオブジェクトから取得
  const categories = data.categories || {};
  
  // 合計金額を計算
  let totalAmount = 0;
  for (const cat in categories) {
    if (categories[cat]) {
      totalAmount += categories[cat];
    }
  }
  
  // 後方互換: 単一カテゴリの場合
  if (totalAmount === 0 && data.amount && data.category) {
    categories[data.category] = data.amount;
    totalAmount = data.amount;
  }
  
  row[0] = data.payer;           // B: 支払者
  row[1] = data.date;            // C: 日付
  row[2] = totalAmount;          // D: 金額計(税込)
  
  // E: 外食-家族全員
  row[3] = categories['外食全員'] || '';
  
  // F: 外食-家族一部
  row[4] = categories['外食一部'] || '';
  
  // G-K: 日用品（税計算）
  if (categories['日用品']) {
    const calc = calcTax(categories['日用品'], 0.10);
    row[5] = calc.taxExcluded;  // G: 日用品10%(税抜)
    row[6] = calc.tax;          // H: 日用品外税
    row[7] = '';                // I: ?
    row[8] = '';                // J: ?
    row[9] = categories['日用品']; // K: 日用品小計
  } else {
    row[5] = '';
    row[6] = '';
    row[7] = '';
    row[8] = '';
    row[9] = '';
  }
  
  // L-P: 除外（税計算）
  let excludeTotal = 0;
  
  // L-M: 除外8%
  if (categories['除外8']) {
    const calc = calcTax(categories['除外8'], 0.08);
    row[10] = calc.taxExcluded; // L: 除外8%(税抜)
    row[11] = calc.tax;         // M: 除外8%外税
    excludeTotal += categories['除外8'];
  } else {
    row[10] = '';
    row[11] = '';
  }
  
  // N-O: 除外10%
  if (categories['除外10']) {
    const calc = calcTax(categories['除外10'], 0.10);
    row[12] = calc.taxExcluded; // N: 除外10%(税抜)
    row[13] = calc.tax;         // O: 除外10%外税
    excludeTotal += categories['除外10'];
  } else {
    row[12] = '';
    row[13] = '';
  }
  
  // P: 除外小計
  row[14] = excludeTotal || '';
  
  // Q: 食費(税込)
  row[15] = categories['食費'] || '';
  
  // R: メモ(用途)
  row[16] = data.memo || '';
  
  // 日付列（C列）が空の最初の行を探す（5行目以降）
  const dateColumn = sheet.getRange('C5:C').getValues();
  let targetRow = -1;
  
  for (let i = 0; i < dateColumn.length; i++) {
    if (dateColumn[i][0] === '' || dateColumn[i][0] === null) {
      targetRow = i + 5; // 5行目から開始なので+5
      break;
    }
  }
  
  // 空の行が見つからなければ最終行の次に追加
  if (targetRow === -1) {
    targetRow = sheet.getLastRow() + 1;
  }
  
  // 指定行のB列からデータを書き込む（B列=2）
  const range = sheet.getRange(targetRow, 2, 1, row.length);
  range.setValues([row]);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: '追記しました', row: targetRow }))
    .setMimeType(ContentService.MimeType.JSON);
}

// テスト用関数
function testAppend() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        payer: 'ひろち',
        date: '2025/12/1',
        amount: 1000,
        category: '食費',
        memo: 'テスト'
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}
