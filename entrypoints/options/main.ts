import { awsCredentialsItem } from '@/utils/aws-credentials';

const form = document.querySelector<HTMLFormElement>('#credentials')!;
const statusLabel = document.querySelector<HTMLSpanElement>('#status')!;
const accessKeyIdInput = form.elements.namedItem('accessKeyId') as HTMLInputElement;
const secretAccessKeyInput = form.elements.namedItem('secretAccessKey') as HTMLInputElement;

// シークレットは画面に戻さず、保存済みかどうかだけ分かるようにする
const saved = await awsCredentialsItem.getValue();
if (saved) {
  accessKeyIdInput.value = saved.accessKeyId;
  statusLabel.textContent = '保存済み';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await awsCredentialsItem.setValue({
    accessKeyId: accessKeyIdInput.value.trim(),
    secretAccessKey: secretAccessKeyInput.value.trim(),
  });
  secretAccessKeyInput.value = '';
  statusLabel.textContent = '保存しました';
});
