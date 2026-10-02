# 技術スタック

## 前提条件

| 項目 | 内容 |
|---|---|
| 利用者 | 自分だけ（配布しない） |
| ブラウザ / OS | Chrome のみ / Windows |
| 対象とする音声 | ブラウザで再生しているコンテンツ（YouTube など） |
| 元の言語 | 英語、韓国語 |
| 翻訳先の言語 | 日本語 |
| 開発環境 | WSL2 |

## 採用する技術

| 役割 | 採用する技術 |
|---|---|
| アプリの形 | Chrome 拡張機能（Manifest V3） |
| 言語・フレームワーク | TypeScript + [WXT](https://wxt.dev/) |
| 画面 | Preact（ポップアップ、設定画面、動画に重ねる字幕） |
| 音声取得 | `chrome.tabCapture` + offscreen document + AudioWorklet（16kHz / 16bit PCM に変換） |
| 文字起こし | Amazon Transcribe Streaming（`en-US` / `ko-KR`） |
| 翻訳 | Amazon Translate（`en` → `ja`、`ko` → `ja`） |
| 使うリージョン | ap-northeast-1（東京） |
| AWS の認証 | 必要な権限だけを持つ IAM ユーザーのアクセスキー（設定画面から入力し `chrome.storage.local` に保存） |

## 決めた理由

### Chrome 拡張機能にした理由

Web アプリ（`getDisplayMedia`）とデスクトップアプリ（WASAPI ループバックで OS の出力音声を取る）とも比べて決めた。

- `chrome.tabCapture` を使えば、タブの音声を毎回タブを選ぶ操作なしで取得できる。
- content script で、字幕を動画の上に直接重ねて表示できる。
- 対象はブラウザで再生するものに限るので、OS の音声を取るデスクトップアプリにする必要がない。

### 認証を IAM ユーザーのアクセスキーにした理由

自分しか使わないので、Cognito Identity Pool などの一時的な認証情報を発行する仕組みは用意しない。被害を抑えるために次の対策をとる。

- キーをコードやリポジトリに含めない。
- 権限は `transcribe:StartStreamTranscriptionWebSocket` と `translate:TranslateText` の 2 つに絞る。
- AWS Budgets で使いすぎの警告を出す。

AWS の環境はこの IAM ユーザーと予算アラートだけなので、CDK などで構成をコード化するのは見送る。

### 元の言語を手で選ぶ方式にした理由

動画は普通 1 本につき 1 言語なので、ポップアップで英語／韓国語を選ぶ方式で十分。言語を固定したほうが文字起こしの精度が安定し、自動判定にかかる待ち時間も生じない。自動判定（`IdentifyLanguage`）は必要になったら追加する。

## 実装上の注意点

- `tabCapture` で音声を取ると、そのタブが無音になる。取得した音声を `AudioContext.destination` に流して再生を戻す。
- Transcribe は、話の途中の仮の結果（partial）と、文の区切りで確定した結果（final）を返す。final だけを翻訳すると字幕が遅れるので、表示方法を工夫する。
- WSL2 の中からは Windows の Chrome を起動できない。ビルドした出力先を `\\wsl.localhost\...` から「パッケージ化されていない拡張機能を読み込む」で読み込む。
