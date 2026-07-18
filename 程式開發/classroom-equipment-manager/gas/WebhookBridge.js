/**
 * 教室設備清點系統 - 通知與催報橋接 (Web App)
 * 負責：
 * 1. 寄發交接人審查信件。
 * 2. 寄發填報人退回修改信件。
 * 3. 向 Google Chat 發送催報卡片訊息。
 */

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const action = req.action;
    let result = { success: false, message: '未知的 Action' };

    if (action === 'sendHandoverNotice') {
      result = sendHandoverNotice(req);
    } else if (action === 'sendRejectNotice') {
      result = sendRejectNotice(req);
    } else if (action === 'sendChatReminder') {
      result = sendChatReminder(req);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 發送交接審查信
function sendHandoverNotice(req) {
  const { to, handoverName, reporterName, classroomId, reviewUrl } = req;
  const subject = `【中正國小設備清點】${classroomId} 交接審查通知`;
  const htmlBody = `
    <h2>教室設備交接確認</h2>
    <p>親愛的 ${handoverName} 老師您好：</p>
    <p>前任負責人 <strong>${reporterName}</strong> 老師已完成 ${classroomId} 的設備清點，並指定您為交接人。</p>
    <p>請點擊下方專屬連結進入系統審查並完成電子簽名：</p>
    <p><a href="${reviewUrl}" style="padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">前往審查與簽名</a></p>
    <br/>
    <p style="color: #64748b; font-size: 12px;">此連結包含安全金鑰，請勿轉傳他人。</p>
  `;
  try {
    MailApp.sendEmail({ to, subject, htmlBody });
    return { success: true, message: '信件已送出' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// 退回修改信
function sendRejectNotice(req) {
  const { to, reporterName, classroomId, reason, formUrl } = req;
  const subject = `【中正國小設備清點】${classroomId} 交接單遭退回`;
  const htmlBody = `
    <h2>交接退回修改通知</h2>
    <p>親愛的 ${reporterName} 老師您好：</p>
    <p>您送出的 ${classroomId} 設備清點單，已被交接人退回，原因如下：</p>
    <blockquote style="border-left: 4px solid red; padding-left: 10px;">${reason}</blockquote>
    <p>請點擊下方連結返回系統修改並重新送出：</p>
    <p><a href="${formUrl}" style="padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px;">重新填報</a></p>
  `;
  try {
    MailApp.sendEmail({ to, subject, htmlBody });
    return { success: true, message: '信件已送出' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// Google Chat Webhook 催報
function sendChatReminder(req) {
  const { webhookUrl, unsubmittedList, formUrl } = req;
  if (!webhookUrl) return { success: false, message: '未設定 Webhook URL' };

  // Google Chat Card Message Format V2
  const cardMessage = {
    "cardsV2": [
      {
        "cardId": "reminderCard",
        "card": {
          "header": {
            "title": "📋 教室設備清點催報通知",
            "subtitle": "總務處溫馨提醒",
            "imageUrl": "https://cdn-icons-png.flaticon.com/512/2907/2907972.png",
            "imageType": "CIRCLE"
          },
          "sections": [
            {
              "widgets": [
                {
                  "textParagraph": {
                    "text": "以下班級尚未完成設備清點作業，請負責老師盡速抽空填寫，以利後續彙整與維修派工："
                  }
                },
                {
                  "textParagraph": {
                    "text": unsubmittedList.map(item => `<b>${item.classroomId}</b> (${item.teacherName})`).join('<br>')
                  }
                },
                {
                  "buttonList": {
                    "buttons": [
                      {
                        "text": "👉 點此前往填報系統",
                        "onClick": {
                          "openLink": {
                            "url": formUrl
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };

  try {
    const res = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      payload: JSON.stringify(cardMessage),
      muteHttpExceptions: true
    });
    return { success: true, responseCode: res.getResponseCode() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
