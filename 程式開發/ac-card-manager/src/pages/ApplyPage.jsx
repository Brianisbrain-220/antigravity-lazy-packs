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
      <div className="public-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-form-card" style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>申請已送出</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            系統已收到您的臨時冷氣卡申請，請靜候管理員審核通知。
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>返回重新填寫</button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', width: '100%', position: 'relative', zIndex: 1 }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#0f766e', textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>🍃 臨時冷氣卡申請</h1>
        <p style={{ textAlign: 'center', color: '#0d9488', marginBottom: '32px', fontWeight: '500' }}>苓雅區中正國小</p>
        
        <form onSubmit={handleSubmit} className="glass-form-card">
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>申請人姓名 <span style={{color:'var(--accent-red)'}}>*</span></label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="例如：王大明"
              value={form.applicantName} 
              onChange={e => setForm({...form, applicantName: e.target.value})} 
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>聯絡信箱 (Email) <span style={{color:'var(--accent-red)'}}>*</span></label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="用於接收審核結果"
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              required
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>申請原因 <span style={{color:'var(--accent-red)'}}>*</span></label>
            <textarea 
              className="form-textarea" 
              placeholder="請簡述為何需要申請臨時冷氣卡"
              value={form.reason} 
              onChange={e => setForm({...form, reason: e.target.value})} 
              required
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>需求張數 <span style={{color:'var(--accent-red)'}}>*</span></label>
              <input 
                type="number" 
                min="1" max="10"
                className="form-input" 
                value={form.cardCount} 
                onChange={e => setForm({...form, cardCount: parseInt(e.target.value) || 1})} 
                required
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>預計每張初始金額</label>
              <input 
                type="number" 
                min="0"
                className="form-input" 
                value={form.initialAmount} 
                onChange={e => setForm({...form, initialAmount: parseInt(e.target.value) || 0})} 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>預計歸還日期 <span style={{color:'var(--accent-red)'}}>*</span></label>
            <input 
              type="date" 
              className="form-input" 
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
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
          {APP_VERSION}
        </div>
      </div>
    </div>
  );
}
