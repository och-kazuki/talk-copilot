import type { AwsCredentials } from './aws-credentials';
import type { SourceLanguage } from './source-language';

// popup・background・offscreen・content script の間でやり取りするメッセージ。
// runtime.sendMessage は全ページに届くため、target で宛先を区別する。

export type BackgroundMessage =
  | { target: 'background'; type: 'get-status' }
  | { target: 'background'; type: 'start-capture'; tabId: number; streamId: string; sourceLanguage: SourceLanguage }
  | { target: 'background'; type: 'stop-capture' }
  // offscreen document からは tabs API を使えないため、background が字幕をタブへ中継する
  | { target: 'background'; type: 'show-subtitle'; tabId: number; text: string };

export type OffscreenMessage = {
  target: 'offscreen';
  type: 'start-capture';
  tabId: number;
  streamId: string;
  // offscreen document からは chrome.storage を使えないため、background が読み出して渡す
  credentials: AwsCredentials;
  sourceLanguage: SourceLanguage;
};

export type ContentMessage = { target: 'content'; type: 'show-subtitle'; text: string };

export type CaptureStatus = { capturing: boolean };
