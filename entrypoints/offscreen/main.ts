import type { AwsCredentials } from '@/utils/aws-credentials';
import type { OffscreenMessage } from '@/utils/messages';
import { createChunkQueue, transcribe } from './transcriber';

const TRANSCRIBE_SAMPLE_RATE = 16000;

browser.runtime.onMessage.addListener((message: OffscreenMessage) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-capture') {
    startCapture(message.streamId, message.credentials).catch((error) => console.error('文字起こしに失敗しました', error));
  }
});

async function startCapture(streamId: string, credentials: AwsCredentials) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as MediaTrackConstraints,
  });

  playBack(stream);

  const audioChunks = createChunkQueue<ArrayBuffer>();
  await encodePcm(stream, (chunk) => audioChunks.push(chunk));
  await transcribe(audioChunks, {
    credentials,
    // 元の言語を選べるようになるまでは英語に固定する
    languageCode: 'en-US',
    sampleRate: TRANSCRIBE_SAMPLE_RATE,
    onTranscript: ({ text, isPartial }) => (isPartial ? console.debug('partial:', text) : console.log('final:', text)),
  });
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
