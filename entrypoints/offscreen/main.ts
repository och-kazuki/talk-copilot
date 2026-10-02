import type { OffscreenMessage } from '@/utils/messages';

browser.runtime.onMessage.addListener((message: OffscreenMessage) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-capture') {
    startCapture(message.streamId).catch((error) => console.error('音声の取得に失敗しました', error));
  }
});

async function startCapture(streamId: string) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as MediaTrackConstraints,
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  // tabCapture で取得している間はタブ自体が無音になるため、取得した音声を再生し直す
  source.connect(audioContext.destination);
}
