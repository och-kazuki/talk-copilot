import type { OffscreenMessage } from '@/utils/messages';

const TRANSCRIBE_SAMPLE_RATE = 16000;

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

  playBack(stream);
  await encodePcm(stream, (chunk) => console.debug('PCM chunk', chunk.byteLength));
}

// tabCapture で取得している間はタブ自体が無音になるため、取得した音声を再生し直す。
// 文字起こし用の 16kHz に落とすと音質が下がるので、再生にはタブ本来のサンプルレートの AudioContext を使う。
function playBack(stream: MediaStream) {
  const audioContext = new AudioContext();
  audioContext.createMediaStreamSource(stream).connect(audioContext.destination);
}

// AudioContext のサンプルレートを 16kHz に指定し、リサンプリングをブラウザに任せる
async function encodePcm(stream: MediaStream, onChunk: (chunk: ArrayBuffer) => void) {
  const audioContext = new AudioContext({ sampleRate: TRANSCRIBE_SAMPLE_RATE });
  await audioContext.audioWorklet.addModule(browser.runtime.getURL('/pcm-encoder-worklet.js'));

  // Transcribe にはモノラルで送るため、ステレオの入力をノード側でモノラルにまとめる
  const encoder = new AudioWorkletNode(audioContext, 'pcm-encoder', {
    channelCount: 1,
    channelCountMode: 'explicit',
  });
  encoder.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(event.data);

  audioContext.createMediaStreamSource(stream).connect(encoder);
  // destination までつながっていないノードは処理されないことがあるため、無音の出力をつないでおく
  encoder.connect(audioContext.destination);
}
