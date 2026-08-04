/**
 * GAS Webhook Client for multi-channel notifications (Email, LINE, Google Chat)
 */

export async function sendViolationNotification(violation) {
  const url = import.meta.env.VITE_GAS_WEBHOOK_URL;
  const payload = {
    action: 'NOTIFY_VIOLATION',
    timestamp: new Date().toISOString(),
    data: violation
  };

  console.log('📬 [GAS Webhook] Sending violation notice:', payload);

  if (!url || url.includes('demo_script_id')) {
    console.info('ℹ️ Demo mode: GAS Webhook simulated successfully.');
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    return result;
  } catch (err) {
    console.error('❌ GAS Webhook error:', err);
    return { success: false, error: err.message };
  }
}

export async function sendRenewalReminderEmail(permit) {
  const url = import.meta.env.VITE_GAS_WEBHOOK_URL;
  const payload = {
    action: 'SEND_RENEWAL_EMAIL',
    timestamp: new Date().toISOString(),
    data: permit
  };

  console.log('✉️ [GAS Webhook] Sending 1-month renewal email:', payload);

  if (!url || url.includes('demo_script_id')) {
    console.info('ℹ️ Demo mode: Renewal reminder simulated successfully.');
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('❌ GAS Webhook error:', err);
    return { success: false, error: err.message };
  }
}
