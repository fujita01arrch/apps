# 商談音声 自動リネーム・Drive移行・Notta連携

Androidスマホの標準ボイスレコーダーで録音した商談音声を、Googleカレンダーの予定と突き合わせて自動リネームし、Googleドライブへ保存、同時にNottaへ共有するための仕組み。

このディレクトリは **Google Apps Script** のソースコードです。GitHub Pagesでは公開されません（`apps/` 配下の静的HTMLアプリとは無関係）。[script.google.com](https://script.google.com/) 上に新規プロジェクトを作り、ここにあるファイルの内容をコピー＆ペーストして使います（`clasp` を使える場合はpushでも構いません）。

全体設計の背景・判断根拠は `/root/.claude/plans/android-google-google-notta-bubbly-balloon.md`（このセッションのプランファイル）を参照してください。

## 全体の流れ

```
Android端末(Tasker) --新規録音を検知-->
  1. HTTP POSTでこのWeb Appに録音開始時刻を送る
  2. Apps Script が Googleカレンダーの前後30分の予定を検索し、
     タイトル中の「◯◯様」からリネーム後のファイル名を判定して返す
  3. Taskerが返却されたファイル名で端末上のファイルをリネーム
  4. Tasker標準の「Google Drive Upload」アクションで
     判定結果に応じたDriveフォルダへアップロード
  5. 同じ（リネーム後の）ファイルをNottaアプリへ共有インテントで自動送信
```

## セットアップ手順

### 1. Apps Scriptプロジェクトの作成
1. [script.google.com](https://script.google.com/) で新規プロジェクトを作成
2. `Code.gs` の内容をエディタに貼り付け
3. 左メニューの「プロジェクトの設定」歯車アイコン → 「スクリプト プロパティ」で以下を追加
   - キー: `SHARED_SECRET`　値: 任意の合言葉（英数字の長めの文字列を推奨。第三者に知られるとカレンダー予定を検索されてしまうため、パスワード相当の強度にする）
4. `appsscript.json` の内容をマニフェストファイルに反映する場合は、エディタの「プロジェクトの設定」で「'appsscript.json' マニフェストファイルをエディタで表示する」をONにしてから内容を上書き

### 2. 動作確認（デプロイ前）
1. 対象のGoogleカレンダーに、実行時刻の近くで「テスト太郎様と商談」のようなタイトルの予定を作成
2. エディタで `testProcessTimestamp` 関数を選択して実行（初回はCalendar APIへのアクセス許可を承認）
3. 「表示」→「ログ」で `{"matched":true,"newFileName":"..."}` のような結果が出るか確認

### 3. Web Appとしてデプロイ
1. 右上の「デプロイ」→「新しいデプロイ」
2. 種類: 「ウェブアプリ」
3. 実行するユーザー: 「自分」
4. アクセスできるユーザー: 「全員」
5. デプロイ後に表示される **ウェブアプリのURL** をメモする（Taskerの設定で使う。第三者に共有しないこと）

### 4. 動作テスト（curl等）
```bash
curl -X POST "<デプロイしたWeb AppのURL>" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<SHARED_SECRETに設定した値>","timestampMillis":1735795200000}'
```
`timestampMillis` はミリ秒のUNIXタイムスタンプ。テスト用カレンダー予定の時刻に近い値を指定して、期待通りの結果が返るか確認する。

## Android端末（Tasker）側の設定

追加インストールするアプリは **Tasker のみ**（買い切り・アカウント不要）。Google Driveアップロードは Tasker本体標準搭載の「Google Drive Upload」アクションを使うため、Autosync等の同期専用アプリは不要。

1. 使用機種の標準ボイスレコーダーの実際の保存先フォルダを確認する（機種依存。Pixelは非公開領域＋クラウド同期前提のため要注意）
2. Taskerの「Google Drive Upload」アクションで、既存のGoogleアカウントにサインインする（新規アカウント作成は不要）
3. 新規プロファイルを作成: トリガー = 録音フォルダへの新規ファイル作成
4. タスク内容:
   1. 変数に新規ファイルの作成時刻（ミリ秒）を取得
   2. HTTP Request（POST）で上記Web App URLへ `{"secret": "...", "timestampMillis": ...}` を送信
   3. レスポンスJSONの `matched` を判定
      - `true` → ファイルを `newFileName + 元の拡張子` にリネームし、Google Drive Uploadで `商談音声/01_完了` へアップロード
      - `false` → 元のファイル名のまま、Google Drive Uploadで `商談音声/02_要確認` へアップロード
   4. リネーム後（またはそのまま）のファイルをNottaアプリ宛の共有インテント（`ACTION_SEND`, MIMEタイプ `audio/*`）で送信

## 既知の注意点

- Web Appは非エンジニアの端末からHTTPで呼べるよう「アクセスできるユーザー: 全員」で公開する必要がある。認証は `SHARED_SECRET` の一致確認のみなので、URLと合言葉は第三者に漏らさないこと。
- Notta側には「Googleドライブフォルダを自動監視して取り込む」機能や、確実に使える公開APIが確認できなかった（2026年8月時点）。そのため本設計では、Nottaアプリへの「共有」操作をTaskerで自動発火させることで代替している。Nottaのアプリ仕様変更で動作しなくなる可能性がある点は留意すること。
- `◯◯様` 抽出の正規表現（`extractClientName_`）は、実際のカレンダー予定タイトルの実例に応じて調整が必要になる場合がある。
