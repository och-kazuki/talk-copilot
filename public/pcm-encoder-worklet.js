// AudioWorklet は拡張機能のバンドルとは別のスコープで動き、URL 指定で読み込む必要があるため、ビルドせずそのまま配信する

// Transcribe Streaming が推奨する 50〜200ms の範囲に収まるよう、16kHz で 100ms 分ずつ送る
const CHUNK_SAMPLES = 1600;

class PcmEncoderProcessor extends AudioWorkletProcessor {
  buffer = new Int16Array(CHUNK_SAMPLES);
  offset = 0;

  process(inputs) {
    const samples = inputs[0]?.[0];
    if (!samples) return true;

    for (const sample of samples) {
      const clamped = Math.max(-1, Math.min(1, sample));
      this.buffer[this.offset++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

      if (this.offset === CHUNK_SAMPLES) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
        this.buffer = new Int16Array(CHUNK_SAMPLES);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-encoder', PcmEncoderProcessor);
