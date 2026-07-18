/**
 * 冷氣卡借用管理系統 — GAS 逾期通知發信橋接
 * 部署為 Web App，任何人可存取（前端呼叫）
 *
 * 學校設定：苓雅區中正國小
 * 使用方式：部署後將 URL 填入系統設定 > GAS 發信設定
 */

// ===== 主路由器 =====
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const action = req.action;
    let result = { success: false, message: '未知的 Action' };

    if (action === 'sendOverdueNotice') {
      result = sendOverdueNotice(req);
    } else if (action === 'sendBatchNotice') {
      result = sendBatchNotice(req);
    } else if (action === 'ping') {
      result = { success: true, message: 'GAS 發信橋接運作正常', timestamp: new Date().toISOString() };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: 'Server Error: ' + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: '冷氣卡借用管理系統 GAS 發信橋接，僅支援 POST 請求'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== 發送單一逾期通知 =====
function sendOverdueNotice(req) {
  const { to, name, unit, cardId, dueDate, overdueDays } = req;

  if (!to || !to.includes('@')) {
    return { success: false, message: '收件信箱格式錯誤' };
  }

  const subject = `【中正國小冷氣卡】逾期催還通知 — ${unit} 卡號 ${cardId}`;
  const htmlBody = buildEmailHtml({ name, unit, cardId, dueDate, overdueDays });
  const plainBody = buildEmailPlain({ name, unit, cardId, dueDate, overdueDays });

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody
    });
    Logger.log(`✅ 已發送逾期通知至 ${to}（${unit}，卡號 ${cardId}，逾期 ${overdueDays} 天）`);
    return { success: true, message: `已發送至 ${to}` };
  } catch (err) {
    Logger.log(`❌ 發信失敗：${err.toString()}`);
    return { success: false, message: '發信失敗：' + err.toString() };
  }
}

// ===== 批次發送逾期通知 =====
function sendBatchNotice(req) {
  const { notices } = req; // [{ to, name, unit, cardId, dueDate, overdueDays }]
  if (!notices || !Array.isArray(notices)) {
    return { success: false, message: 'notices 格式錯誤' };
  }

  let successCount = 0;
  const errors = [];

  notices.forEach(n => {
    const result = sendOverdueNotice(n);
    if (result.success) {
      successCount++;
    } else {
      errors.push(`${n.to}: ${result.message}`);
    }
  });

  return {
    success: true,
    message: `已發送 ${successCount} 封，失敗 ${errors.length} 封`,
    errors
  };
}

// ===== 信件 HTML 範本 =====
function buildEmailHtml({ name, unit, cardId, dueDate, overdueDays }) {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans TC', 'Microsoft JhengHei', sans-serif; background: #f5f7fa; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%); padding: 32px 28px; text-align: center; }
    .header h1 { color: white; font-size: 20px; margin: 0; }
    .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin: 6px 0 0; }
    .body { padding: 28px; }
    .greeting { font-size: 15px; color: #1a202c; margin-bottom: 16px; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
    .alert-box h3 { color: #dc2626; margin: 0 0 8px; font-size: 15px; }
    .info-grid { background: #f8fafc; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
    .info-row { display: flex; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 13px; width: 100px; flex-shrink: 0; }
    .info-value { color: #1a202c; font-size: 13px; font-weight: 600; }
    .cta-text { font-size: 14px; color: #374151; line-height: 1.7; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❄️ 冷氣卡借用管理系統</h1>
      <p>苓雅區中正國小</p>
    </div>
    <div class="body">
      <p class="greeting">親愛的 <strong>${name || unit}</strong> 老師，您好：</p>
      <div class="alert-box">
        <h3>⚠️ 冷氣卡尚未於期限內歸還</h3>
        <p style="color:#7f1d1d;font-size:13px;margin:0;">您所持有的冷氣卡已逾期 <strong>${overdueDays}</strong> 天，請儘速辦理歸還。</p>
      </div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">借用單位</span><span class="info-value">${unit}</span></div>
        <div class="info-row"><span class="info-label">冷氣卡卡號</span><span class="info-value">${cardId}</span></div>
        <div class="info-row"><span class="info-label">應歸還日期</span><span class="info-value">${dueDate}</span></div>
        <div class="info-row"><span class="info-label">已逾期天數</span><span class="info-value" style="color:#dc2626">${overdueDays} 天</span></div>
      </div>
      <p class="cta-text">
        請於收到此信後，儘速攜帶冷氣卡至<strong>總務處</strong>辦理歸還手續。<br>
        若有任何疑問，請聯繫總務處承辦人員。
      </p>
    </div>
    <div class="footer">
      此信件由「苓雅區中正國小冷氣卡借用管理系統」自動發送，請勿直接回覆。<br>
      如有疑問請電洽學校總務處。
    </div>
  </div>
</body>
</html>`;
}

function buildEmailPlain({ name, unit, cardId, dueDate, overdueDays }) {
  return `親愛的 ${name || unit} 老師，您好：

您所持有的冷氣卡已逾期 ${overdueDays} 天，請儘速辦理歸還。

--- 借用資訊 ---
借用單位：${unit}
冷氣卡卡號：${cardId}
應歸還日期：${dueDate}
已逾期天數：${overdueDays} 天

請於收到此信後，儘速攜帶冷氣卡至總務處辦理歸還手續。

此信件由苓雅區中正國小冷氣卡借用管理系統自動發送。`;
}
