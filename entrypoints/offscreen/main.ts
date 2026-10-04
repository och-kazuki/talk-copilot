import type { BackgroundMessage, OffscreenMessage } from '@/utils/messages';
import { SOURCE_LANGUAGES } from '@/utils/source-language';
import { createChunkQueue, transcribe } from './transcriber';
import { createTranslator } from './translator';

const TRANSCRIBE_SAMPLE_RATE = 16000;

browser.runtime.onMessage.addListener((message: OffscreenMessage) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-capture') {
    startCapture(message).catch((error) => console.error('文字起こしに失敗しました', error));
  }
});

async function startCapture({ tabId, streamId, credentials, sourceLanguage }: OffscreenMessage) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as MediaTrackConstraints,
  });

  playBack(stream);

  const language = SOURCE_LANGUAGES[sourceLanguage];
  const translate = createTranslator(credentials, language.translate);
  // 翻訳は並行して進めるが、字幕は話した順に出したいので、表示だけを順番に並べる
  let subtitleQueue = Promise.resolve();

  const audioChunks = createChunkQueue<ArrayBuffer>();
  await encodePcm(stream, (chunk) => audioChunks.push(chunk));
  await transcribe(audioChunks, {
    credentials,
    languageCode: language.transcribe,
    sampleRate: TRANSCRIBE_SAMPLE_RATE,
    onTranscript: ({ text, isPartial }) => {
      if (isPartial) {
        console.debug('partial:', text);
        return;
      }
      console.log('final:', text);
      // 翻訳を待つと次の文字起こし結果の受け取りが遅れるため、待たずに進める
      const translation = translate(text);
      subtitleQueue = subtitleQueue
        .then(() => translation)
        .then(
          (translated) => {
            console.log('translated:', translated);
            showSubtitle(tabId, translated);
          },
          (error) => console.error('翻訳に失敗しました', error),
        );
    },
  });
}

function showSubtitle(tabId: number, text: string) {
  const message: BackgroundMessage = { target: 'background', type: 'show-subtitle', tabId, text };
  browser.runtime.sendMessage(message);
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
