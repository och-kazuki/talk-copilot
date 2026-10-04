import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import type { AwsCredentials } from '@/utils/aws-credentials';
import { REGION } from './transcriber';

// 訳す先は日本語だけなので固定する
const TARGET_LANGUAGE_CODE = 'ja';

export function createTranslator(credentials: AwsCredentials, sourceLanguageCode: string) {
  const client = new TranslateClient({ region: REGION, credentials });

  return async (text: string): Promise<string> => {
    const response = await client.send(
      new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLanguageCode,
        TargetLanguageCode: TARGET_LANGUAGE_CODE,
      }),
    );
    return response.TranslatedText ?? '';
  };
}
