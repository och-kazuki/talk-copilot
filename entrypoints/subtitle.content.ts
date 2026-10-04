import type { ContentMessage } from '@/utils/messages';

const HOST_ID = 'talk-copilot-subtitle';
// 字幕が出たままにならないよう、次の字幕が来ないまましばらく経ったら消す
const HIDE_AFTER_MS = 10_000;

// 全ページに常駐させると広いホスト権限が要るため、開始したときに background から注入する
export default defineContentScript({
  registration: 'runtime',
  main() {
    // 開始と停止を繰り返すと何度も注入されるため、2 回目以降は何もしない
    if (document.getElementById(HOST_ID)) return;

    const subtitle = createSubtitle();
    browser.runtime.onMessage.addListener((message: ContentMessage) => {
      if (message.target !== 'content') return;

      if (message.type === 'show-subtitle') subtitle.show(message.text);
    });
  },
});

function createSubtitle() {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none; display: none;';
  // ページの CSS の影響を受けないよう、shadow DOM の中に表示する
  const shadow = host.attachShadow({ mode: 'open' });
  const text = document.createElement('div');
  text.style.cssText = `
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    padding: 4px 12px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font: 600 22px/1.4 sans-serif;
    text-align: center;
    white-space: pre-wrap;
  `;
  shadow.append(text);

  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  // 全画面表示中は全画面の要素の外が描画されないため、表示するたびに置き場所と位置を合わせ直す。
  // video 要素そのものが全画面のときは中に要素を置けないので、字幕は出せない。
  const place = () => {
    const fullscreen = document.fullscreenElement;
    const parent = fullscreen && !(fullscreen instanceof HTMLVideoElement) ? fullscreen : document.body;
    if (host.parentElement !== parent) parent.append(host);

    const rect = findMainVideo()?.getBoundingClientRect();
    const area = rect && rect.width > 0 ? rect : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    host.style.left = `${area.left + area.width * 0.05}px`;
    host.style.width = `${area.width * 0.9}px`;
    // 動画プレーヤーの操作バーと重ならないよう、下端から少し上げる
    host.style.bottom = `${window.innerHeight - area.bottom + area.height * 0.12}px`;
  };

  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });
  document.addEventListener('fullscreenchange', place);

  return {
    show(value: string) {
      text.textContent = value;
      host.style.display = 'block';
      place();

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => (host.style.display = 'none'), HIDE_AFTER_MS);
    },
  };
}

// 広告や小さなプレビュー動画もあるため、画面上でいちばん大きく表示されている動画を字幕の対象にする
function findMainVideo(): HTMLVideoElement | undefined {
  let largest: HTMLVideoElement | undefined;
  let largestArea = 0;
  for (const video of document.querySelectorAll('video')) {
    const { width, height } = video.getBoundingClientRect();
    if (width * height > largestArea) {
      largest = video;
      largestArea = width * height;
    }
  }
  return largest;
}
