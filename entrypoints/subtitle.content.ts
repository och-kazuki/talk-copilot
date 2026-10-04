import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { ContentMessage } from '@/utils/messages';

const HOST_ID = 'talk-copilot-subtitle';
// 字幕ごとに、読み終えられるだけの時間を文字数から決めて表示する。
// 日本語字幕の目安である 1 秒あたり 4 文字で読めるようにし、見つけて読み始めるまでの時間を足す。
const BASE_DISPLAY_MS = 2_000;
const DISPLAY_MS_PER_CHAR = 250;
// 話が途切れず続くと字幕が増え続けて動画を覆ってしまうため、並べる数に上限を設ける
const MAX_LINES = 3;

// 全ページに常駐させると広いホスト権限が要るため、開始したときに background から注入する
export default defineContentScript({
  registration: 'runtime',
  // 開始と停止を繰り返すと何度も注入され、拡張機能を更新するとそれまでの content script は動かなくなる。
  // 新しく注入されたら前のものは ctx が無効になるので、そのとき字幕の要素とリスナーを片付けて入れ替える。
  main(ctx) {
    const subtitle = createSubtitle(ctx);
    const onMessage = (message: ContentMessage) => {
      if (message.target !== 'content') return;

      if (message.type === 'show-subtitle') subtitle.show(message.text);
    };
    browser.runtime.onMessage.addListener(onMessage);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(onMessage));
  },
});

function createSubtitle(ctx: ContentScriptContext) {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none; display: none;';
  // ページの CSS の影響を受けないよう、shadow DOM の中に表示する
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .line {
      width: fit-content;
      max-width: 100%;
      margin: 4px auto 0;
      padding: 4px 12px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      font: 600 22px/1.4 sans-serif;
      text-align: center;
      white-space: pre-wrap;
    }
    /* 新しい字幕がどれか分かるよう、古い字幕は少し薄くする */
    .line:not(:last-child) { opacity: 0.7; }
  `;
  shadow.append(style);
  ctx.onInvalidated(() => host.remove());

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

  ctx.addEventListener(window, 'resize', place);
  ctx.addEventListener(window, 'scroll', place, { passive: true });
  ctx.addEventListener(document, 'fullscreenchange', place);

  return {
    // 前の字幕を読み終える前に次の字幕が届くこともあるため、置き換えずに下へ足していく
    show(value: string) {
      const line = document.createElement('div');
      line.className = 'line';
      line.textContent = value;
      shadow.append(line);

      const lines = shadow.querySelectorAll('.line');
      if (lines.length > MAX_LINES) lines[0]!.remove();

      host.style.display = 'block';
      place();

      ctx.setTimeout(() => {
        line.remove();
        if (!shadow.querySelector('.line')) host.style.display = 'none';
      }, BASE_DISPLAY_MS + value.length * DISPLAY_MS_PER_CHAR);
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
