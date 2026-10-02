# セットアップと動作確認

## 1. AWS の準備

### IAM ユーザー

1. IAM コンソールで、コンソールにログインしない IAM ユーザーを作る（例: `talk-copilot`）。
2. 次のインラインポリシーを付ける。

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "transcribe:StartStreamTranscriptionWebSocket",
           "translate:TranslateText"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. 「セキュリティ認証情報」タブでアクセスキーを作る。用途には「AWS の外部で実行されるアプリケーション」を選ぶ。

### 予算アラート

AWS Budgets で月額のコスト予算（例: 10 USD）を作り、80% と 100% に達したらメールで通知されるようにする。

## 2. 拡張機能を読み込む

WSL2 でビルドする。

```bash
npm install
```

```bash
npm run build
```

Windows の Chrome で次の手順を行う。

1. `chrome://extensions` を開き、右上の「デベロッパー モード」をオンにする。
2. 「パッケージ化されていない拡張機能を読み込む」で次のフォルダを選ぶ。

   ```
   \\wsl.localhost\Ubuntu\home\kazuki\src\talk-copilot\.output\chrome-mv3
   ```

3. コードを変えたら `npm run build` をやり直し、拡張機能の更新ボタンを押す。

## 3. アクセスキーを登録する

ツールバーの Talk Copilot アイコンからポップアップを開き、「設定」から「1. AWS の準備」で作ったアクセスキーを保存する。

## 4. 動作を確認する

1. YouTube で英語の動画を再生し、ポップアップの「開始」を押す。
   - 音声が途切れず聞こえ続けることを確認する。
2. `chrome://extensions` で Talk Copilot の「ビューを検証」にある `offscreen.html` を開き、DevTools のコンソールを確認する。
   - `final:` で始まる行に、確定した文字起こし結果が出る。
   - `partial:` で始まる途中の結果は、ログレベルの「詳細（Verbose）」をオンにすると表示される。
3. ポップアップの「停止」を押し、タブの音声が普段どおりに戻ることを確認する。

`offscreen.html` は「開始」を押している間だけ存在する。
