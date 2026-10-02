import type { BackgroundMessage, CaptureStatus } from '@/utils/messages';

const toggleButton = document.querySelector<HTMLButtonElement>('#toggle')!;
let capturing = false;

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
  const streamId = await browser.tabCapture.getMediaStreamId({ targetTabId: tab?.id });
  return sendToBackground({ target: 'background', type: 'start-capture', streamId });
}

function sendToBackground(message: BackgroundMessage): Promise<CaptureStatus> {
  return browser.runtime.sendMessage(message);
}

function render(status: CaptureStatus) {
  capturing = status.capturing;
  toggleButton.textContent = capturing ? '停止' : '開始';
  toggleButton.disabled = false;
}
