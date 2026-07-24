import React, { useState } from 'react';
import { createApplication } from '../applications_db';
import { useToast } from '../ToastContext';
import { APP_VERSION } from '../config/version';

export default function ApplyPage() {
  const [form, setForm] = useState({
    applicantName: '',
    email: '',
    reason: '',
    cardCount: 1,
    initialAmount: 0,
    expectedReturnDate: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.applicantName || !form.email || !form.reason || !form.expectedReturnDate) {
      toast('請填寫所有必填欄位', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createApplication(form);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast('提交失敗：' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', padding: '20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '44px', textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#fff', marginBottom: '16px' }}>申請已送出</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
            系統已收到您的臨時冷氣卡申請，請靜候管理員審核通知。
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>返回重新填寫</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0e1a', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#fff' }}>❄️ 臨時冷氣卡申請</h1>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>苓雅區中正國小</p>
        
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>申請人姓名 <span style={{color:'red'}}>*</span></label>
            <input 
              type="text" 
              className="input" 
              placeholder="例如：王大明"
              value={form.applicantName} 
              onChange={e => setForm({...form, applicantName: e.target.value})} 
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>聯絡信箱 (Email) <span style={{color:'red'}}>*</span></label>
            <input 
              type="email" 
              className="input" 
              placeholder="用於接收審核結果"
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>申請原因 <span style={{color:'red'}}>*</span></label>
            <textarea 
              className="input" 
              placeholder="請簡述為何需要申請臨時冷氣卡"
              value={form.reason} 
              onChange={e => setForm({...form, reason: e.target.value})} 
              required
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>需求張數 <span style={{color:'red'}}>*</span></label>
              <input 
                type="number" 
                min="1" max="10"
                className="input" 
                value={form.cardCount} 
                onChange={e => setForm({...form, cardCount: parseInt(e.target.value) || 1})} 
                required
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>預計每張初始金額</label>
              <input 
                type="number" 
                min="0"
                className="input" 
                value={form.initialAmount} 
                onChange={e => setForm({...form, initialAmount: parseInt(e.target.value) || 0})} 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>預計歸還日期 <span style={{color:'red'}}>*</span></label>
            <input 
              type="date" 
              className="input" 
              value={form.expectedReturnDate} 
              onChange={e => setForm({...form, expectedReturnDate: e.target.value})} 
              required
              style={{ width: '100%' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
            disabled={submitting}
          >
            {submitting ? '送出中...' : '送出申請單'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {APP_VERSION}
        </div>
      </div>
    </div>
  );
}
