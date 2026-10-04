import type { BackgroundMessage, CaptureStatus } from '@/utils/messages';
import { SOURCE_LANGUAGES, type SourceLanguage } from '@/utils/source-language';
import { storage } from 'wxt/utils/storage';

// 同じ言語の動画を続けて見ることが多いので、前回選んだ言語を覚えておく。
// defineItem は作った時点でストレージを読みにいくため、chrome.storage を使えない offscreen document からも
// 読み込まれる utils/source-language.ts には置かない。
const sourceLanguageItem = storage.defineItem<SourceLanguage>('local:sourceLanguage', {
  fallback: 'en',
});

const toggleButton = document.querySelector<HTMLButtonElement>('#toggle')!;
const sourceLanguageSelect = document.querySelector<HTMLSelectElement>('#source-language')!;
let capturing = false;

for (const [value, { label }] of Object.entries(SOURCE_LANGUAGES)) {
  sourceLanguageSelect.add(new Option(label, value));
}
sourceLanguageSelect.value = await sourceLanguageItem.getValue();
sourceLanguageSelect.addEventListener('change', () => sourceLanguageItem.setValue(sourceLanguageSelect.value as SourceLanguage));

document.querySelector('#open-options')!.addEventListener('click', () => browser.runtime.openOptionsPage());

toggleButton.addEventListener('click', async () => {
  toggleButton.disabled = true;
  const status = capturing ? await sendToBackground({ target: 'background', type: 'stop-capture' }) : await startCapture();
  render(status);
});

render(await sendToBackground({ target: 'background', type: 'get-status' }));

// getMediaStreamId はユーザーが拡張機能を操作したことを起点に呼ぶ必要があるため、ポップアップで呼ぶ
async function startCapture(): Promise<CaptureStatus> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = tab!.id!;
  const streamId = await browser.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const sourceLanguage = sourceLanguageSelect.value as SourceLanguage;
  return sendToBackground({ target: 'background', type: 'start-capture', tabId, streamId, sourceLanguage });
}

function sendToBackground(message: BackgroundMessage): Promise<CaptureStatus> {
  return browser.runtime.sendMessage(message);
}

function render(status: CaptureStatus) {
  capturing = status.capturing;
  toggleButton.textContent = capturing ? '停止' : '開始';
  toggleButton.disabled = false;
  // 文字起こしの言語は開始時に決まるので、取得中は変えられないようにする
  sourceLanguageSelect.disabled = capturing;
}
