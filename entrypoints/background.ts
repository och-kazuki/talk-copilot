import { awsCredentialsItem } from '@/utils/aws-credentials';
import type { BackgroundMessage, CaptureStatus, ContentMessage, OffscreenMessage } from '@/utils/messages';

// MV3 の service worker では getUserMedia を呼べないため、音声処理は offscreen document に任せる
const OFFSCREEN_PATH = '/offscreen.html';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    if (message.target !== 'background') return;

    if (message.type === 'show-subtitle') {
      const subtitle: ContentMessage = { target: 'content', type: 'show-subtitle', text: message.text };
      // 取得中にタブを閉じたり移動したりすると届け先がなくなるが、文字起こしは続けたいので無視する
      browser.tabs.sendMessage(message.tabId, subtitle).catch(() => {});
      return;
    }

    handleMessage(message).then(sendResponse);
    return true;
  });
});

async function handleMessage(message: Exclude<BackgroundMessage, { type: 'show-subtitle' }>): Promise<CaptureStatus> {
  switch (message.type) {
    case 'get-status':
      break;
    case 'start-capture':
      await startCapture(message.tabId, message.streamId);
      break;
    case 'stop-capture':
      await stopCapture();
      break;
  }
  return { capturing: await hasOffscreenDocument() };
}

async function startCapture(tabId: number, streamId: string) {
  if (await hasOffscreenDocument()) return;

  const credentials = await awsCredentialsItem.getValue();
  if (!credentials) {
    await browser.runtime.openOptionsPage();
    return;
  }

  // ポップアップを開いたことで activeTab の権限が得られているので、そのタブにだけ字幕を表示する仕組みを入れる
  await browser.scripting.executeScript({
    target: { tabId },
    files: ['/content-scripts/subtitle.js'],
  });

  await browser.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification: 'タブの音声を取得して文字起こしするため',
  });
  const message: OffscreenMessage = { target: 'offscreen', type: 'start-capture', tabId, streamId, credentials };
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
