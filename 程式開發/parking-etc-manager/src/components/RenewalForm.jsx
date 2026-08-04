import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, CheckCircle2, AlertCircle, Car, ArrowRight } from 'lucide-react';

export default function RenewalForm({ permits, onRenewSubmit }) {
  const { user } = useAuth();
  const [selectedPermitId, setSelectedPermitId] = useState(() => {
    // 預設找到當前登入者自己舊的正式員工停車證
    const myPermit = permits.find(p => p.email === user?.email || p.name === '王小明');
    return myPermit ? myPermit.id : (permits[0]?.id || '');
  });

  const selectedPermit = permits.find(p => p.id === selectedPermitId) || null;

  const [formData, setFormData] = useState(() => {
    if (selectedPermit) {
      return {
        name: selectedPermit.name,
        department: selectedPermit.department,
        plate1: selectedPermit.plate1,
        plate2: selectedPermit.plate2 || '',
        phone: selectedPermit.phone || '0912-345-678',
        relationship: selectedPermit.relationship || '本人',
        role: selectedPermit.role,
        isEtcApplied: selectedPermit.isEtcApplied
      };
    }
    return {
      name: user?.displayName || '',
      department: '教務處',
      plate1: 'ABC-1234',
      plate2: '',
      phone: '0912-345-678',
      relationship: '本人',
      role: '本校正職教職員工',
      isEtcApplied: true
    };
  });

  const [isModified, setIsModified] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSelectPermit = (id) => {
    setSelectedPermitId(id);
    const target = permits.find(p => p.id === id);
    if (target) {
      setFormData({
        name: target.name,
        department: target.department,
        plate1: target.plate1,
        plate2: target.plate2 || '',
        phone: target.phone || '0912-345-678',
        relationship: target.relationship || '本人',
        role: target.role,
        isEtcApplied: target.isEtcApplied
      });
      setIsModified(false);
      setSubmitted(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsModified(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onRenewSubmit({
      ...selectedPermit,
      ...formData,
      status: 'APPROVED', // 續辦自動提交審核
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });
    setSubmitted(true);
  };

  return (
    <div className="renewal-wrap">
      <div className="renewal-banner">
        <div className="banner-icon">
          <RefreshCw size={28} />
        </div>
        <div>
          <h3>停車證有效期限倒數提醒與一鍵續辦</h3>
          <p>系統自動檢核原停車證到期前 1 個月對象，若車牌與個人資料無須異動，點擊即可一鍵展延下一學年度申請！</p>
        </div>
      </div>

      <div className="renewal-selector-bar">
        <label>選擇即將到期的歷史停車證紀錄：</label>
        <select
          value={selectedPermitId}
          onChange={(e) => handleSelectPermit(e.target.value)}
          className="select-input"
        >
          {permits.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.role}) - 車牌：{p.plate1} - 目前到期日：{p.expiryDate}
            </option>
          ))}
        </select>
      </div>

      {submitted ? (
        <div className="success-banner">
          <CheckCircle2 size={36} className="icon-success" />
          <div>
            <h4>🎉 續辦申請已成功送出！</h4>
            <p>您的下一年度停車證已更新登記，管理員審核完畢後即可直接套印出證。</p>
            <button onClick={() => setSubmitted(false)} className="btn-secondary mt-2">
              再次修改或返回
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="renewal-form-card">
          <div className="form-header-bar">
            <span>確認續辦對象與聯絡資訊</span>
            <span className={`status-badge ${isModified ? 'badge-warning' : 'badge-success'}`}>
              {isModified ? '✎ 已變更車牌/資訊' : '✔ 資料一致免修改'}
            </span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>姓名 / 身分別</label>
              <input
                type="text"
                disabled
                value={`${formData.name} (${formData.role})`}
                className="input-disabled"
              />
            </div>
            <div className="form-group">
              <label>申請單位</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div className="form-group">
              <label>第一輛車牌號碼 (最常駕駛)</label>
              <input
                type="text"
                name="plate1"
                value={formData.plate1}
                onChange={handleChange}
                className="input-field font-mono"
                required
              />
            </div>
            <div className="form-group">
              <label>第二輛車牌號碼 (選填)</label>
              <input
                type="text"
                name="plate2"
                value={formData.plate2}
                onChange={handleChange}
                className="input-field font-mono"
                placeholder="例如：XYZ-5678"
              />
            </div>
            <div className="form-group">
              <label>聯絡手機號碼</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div className="form-group">
              <label>與車主關係</label>
              <select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                className="select-input"
              >
                <option value="本人">本人</option>
                <option value="夫妻">夫妻</option>
                <option value="其他">其他家屬</option>
              </select>
            </div>
          </div>

          <div className="form-footer">
            <div className="footer-note">
              <AlertCircle size={16} />
              <span>依規定同一時間僅限停放一部核可車輛入校。</span>
            </div>
            <button type="submit" className="btn-primary btn-lg">
              <CheckCircle2 size={20} />
              <span>{isModified ? '確認變更並續辦申請' : '確認無誤，1 鍵續辦展延'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
