import type { LanguageCode } from '@aws-sdk/client-transcribe-streaming';
import { storage } from 'wxt/utils/storage';

// Transcribe と Translate で言語コードの書き方が違うため、両方をまとめて持つ
export const SOURCE_LANGUAGES = {
  en: { label: '英語', transcribe: 'en-US', translate: 'en' },
  ko: { label: '韓国語', transcribe: 'ko-KR', translate: 'ko' },
} as const satisfies Record<string, { label: string; transcribe: LanguageCode; translate: string }>;

export type SourceLanguage = keyof typeof SOURCE_LANGUAGES;

// 同じ言語の動画を続けて見ることが多いので、前回選んだ言語を覚えておく
export const sourceLanguageItem = storage.defineItem<SourceLanguage>('local:sourceLanguage', {
  fallback: 'en',
});
