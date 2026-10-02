import { storage } from 'wxt/utils/storage';

export type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

// 自分専用のツールなので、IAM ユーザーのアクセスキーをこの端末のローカルストレージにだけ保存する
export const awsCredentialsItem = storage.defineItem<AwsCredentials | null>('local:awsCredentials', {
  fallback: null,
});
