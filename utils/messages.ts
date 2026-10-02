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
};

export type CaptureStatus = { capturing: boolean };
