import type { BackgroundMessage, CaptureStatus, OffscreenMessage } from '@/utils/messages';

// MV3 の service worker では getUserMedia を呼べないため、音声処理は offscreen document に任せる
const OFFSCREEN_PATH = '/offscreen.html';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    if (message.target !== 'background') return;

    handleMessage(message).then(sendResponse);
    return true;
  });
});

async function handleMessage(message: BackgroundMessage): Promise<CaptureStatus> {
  switch (message.type) {
    case 'get-status':
      break;
    case 'start-capture':
      await startCapture(message.streamId);
      break;
    case 'stop-capture':
      await stopCapture();
      break;
  }
  return { capturing: await hasOffscreenDocument() };
}

async function startCapture(streamId: string) {
  if (await hasOffscreenDocument()) return;

  await browser.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification: 'タブの音声を取得して文字起こしするため',
  });
  const message: OffscreenMessage = { target: 'offscreen', type: 'start-capture', streamId };
  await browser.runtime.sendMessage(message);
}

// offscreen document を閉じれば取得中のストリームも止まり、タブの音声は元に戻る
async function stopCapture() {
  if (!(await hasOffscreenDocument())) return;

  await browser.offscreen.closeDocument();
}

// service worker は停止・再起動されるため、取得中かどうかは変数で持たず offscreen document の有無で判断する
async function hasOffscreenDocument(): Promise<boolean> {
  const contexts = await browser.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  return contexts.length > 0;
}
