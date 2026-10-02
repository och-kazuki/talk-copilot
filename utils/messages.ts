import type { AwsCredentials } from './aws-credentials';

// popup・background・offscreen の間でやり取りするメッセージ。
// runtime.sendMessage は全ページに届くため、target で宛先を区別する。

export type BackgroundMessage =
  | { target: 'background'; type: 'get-status' }
  | { target: 'background'; type: 'start-capture'; streamId: string }
  | { target: 'background'; type: 'stop-capture' };

export type OffscreenMessage = {
  target: 'offscreen';
  type: 'start-capture';
  streamId: string;
  // offscreen document からは chrome.storage を使えないため、background が読み出して渡す
  credentials: AwsCredentials;
};

export type CaptureStatus = { capturing: boolean };
