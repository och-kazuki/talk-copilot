import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Talk Copilot',
    description: 'ブラウザで再生中の音声をリアルタイムに翻訳する',
    permissions: ['tabCapture', 'offscreen', 'storage', 'activeTab', 'scripting'],
  },
  // WSL2 からは Windows の Chrome を起動できないため、ビルド結果を手動で読み込む
  webExt: {
    disabled: true,
  },
});
