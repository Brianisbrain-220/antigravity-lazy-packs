export async function sendEmail(to, subject, htmlBody) {
  const gasUrl = localStorage.getItem('gasWebhookUrl');
  if (!gasUrl) {
    throw new Error('請先至「系統設定」配置 GAS 發信 Webhook URL');
  }

  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'sendEmail',
      to,
      subject,
      htmlBody,
      plainBody: '請使用支援 HTML 的郵件軟體讀取。'
    }) // Note: GAS handles cross-origin POST correctly if configured right
  });

  const res = await response.json();
  if (!res.success) {
    throw new Error(res.message || '未知錯誤');
  }
}
