import {
  type AudioStream,
  type LanguageCode,
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from '@aws-sdk/client-transcribe-streaming';
import type { AwsCredentials } from '@/utils/aws-credentials';

// 日本から使うので、通信の遅れが小さい東京リージョンに固定する
export const REGION = 'ap-northeast-1';

export type Transcript = {
  text: string;
  isPartial: boolean;
};

export type TranscribeOptions = {
  credentials: AwsCredentials;
  languageCode: LanguageCode;
  sampleRate: number;
  onTranscript: (transcript: Transcript) => void;
};

export async function transcribe(audioChunks: AsyncIterable<ArrayBuffer>, options: TranscribeOptions) {
  const client = new TranscribeStreamingClient({ region: REGION, credentials: options.credentials });
  const response = await client.send(
    new StartStreamTranscriptionCommand({
      LanguageCode: options.languageCode,
      MediaEncoding: 'pcm',
      MediaSampleRateHertz: options.sampleRate,
      AudioStream: toAudioStream(audioChunks),
    }),
  );

  for await (const event of response.TranscriptResultStream ?? []) {
    for (const result of event.TranscriptEvent?.Transcript?.Results ?? []) {
      const text = result.Alternatives?.[0]?.Transcript;
      if (text) options.onTranscript({ text, isPartial: result.IsPartial ?? false });
    }
  }
}

async function* toAudioStream(audioChunks: AsyncIterable<ArrayBuffer>): AsyncIterable<AudioStream> {
  for await (const chunk of audioChunks) {
    yield { AudioEvent: { AudioChunk: new Uint8Array(chunk) } };
  }
}

// AudioWorklet からはコールバックでチャンクが届くが、SDK は AsyncIterable を受け取るため、その間をつなぐ
export function createChunkQueue<T>() {
  const buffered: T[] = [];
  let notify: (() => void) | undefined;

  return {
    push(chunk: T) {
      buffered.push(chunk);
      notify?.();
      notify = undefined;
    },
    // 停止は offscreen document ごと閉じて行うので、終わりのない反復にしている
    async *[Symbol.asyncIterator]() {
      while (true) {
        while (buffered.length > 0) yield buffered.shift()!;
        await new Promise<void>((resolve) => (notify = resolve));
      }
    },
  };
}
