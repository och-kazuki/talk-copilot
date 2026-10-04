import type { LanguageCode } from '@aws-sdk/client-transcribe-streaming';

// Transcribe と Translate で言語コードの書き方が違うため、両方をまとめて持つ
export const SOURCE_LANGUAGES = {
  en: { label: '英語', transcribe: 'en-US', translate: 'en' },
  ko: { label: '韓国語', transcribe: 'ko-KR', translate: 'ko' },
} as const satisfies Record<string, { label: string; transcribe: LanguageCode; translate: string }>;

export type SourceLanguage = keyof typeof SOURCE_LANGUAGES;
