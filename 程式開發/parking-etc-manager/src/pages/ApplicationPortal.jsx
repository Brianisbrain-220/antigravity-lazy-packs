import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import RulesAgreement from '../components/RulesAgreement';
import RenewalForm from '../components/RenewalForm';
import { Car, Radio, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApplicationPortal({ permits, setPermits, rulesText }) {
  const { user } = useAuth();
  const [portalTab, setPortalTab] = useState('NEW_PERMIT');
  const [agreed, setAgreed] = useState(false);

  // 新辦停車證表單 State
  const [permitForm, setPermitForm] = useState({
    name: user?.displayName || '',
    department: '',
    role: '本校正職教職員工',
    plate1: '',
    plate2: '',
    relationship: '本人',
    phone: '',
    isEtcApplied: true
  });

  // ETC 登記表單 State
  const [etcForm, setEtcForm] = useState({
    name: user?.displayName || '',
    department: '',
    role: '本校正職教職員工',
    plate1: '',
    phone: ''
  });

  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  const rolesList = [
    { label: '本校正職教職員工', type: 'REGULAR', desc: '核發一般汽車停車證' },
    { label: '代理代課教師', type: 'TEMP', desc: '核發臨時汽車停車證' },
    { label: '外聘教師', type: 'TEMP', desc: '核發臨時汽車停車證' },
    { label: '社團教師', type: 'TEMP', desc: '核發臨時汽車停車證' },
    { label: '志工', type: 'TEMP', desc: '核發臨時汽車停車證' }
  ];

  const handlePermitSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      alert('請先勾選同意「校園汽機車及 ETC 停車管理規範」！');
      return;
    }
    const newEntry = {
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      name: permitForm.name || user?.displayName || '中正教師',
      email: user?.email || 'user@ccps.kh.edu.tw',
      role: permitForm.role,
      department: permitForm.department,
      plate1: permitForm.plate1.toUpperCase().trim(),
      plate2: permitForm.plate2.toUpperCase().trim(),
      relationship: permitForm.relationship,
      phone: permitForm.phone,
      etcCode: '', // 留空由事務組後台填報
      status: 'PENDING',
      expiryDate: permitForm.role === '本校正職教職員工' ? '114. 08. 31' : '114. 07. 31',
      academicYear: permitForm.role === '本校正職教職員工' ? '114' : '',
      isEtcApplied: permitForm.isEtcApplied
    };

    setPermits([newEntry, ...permits]);
    setSubmitSuccessMsg(`🚗 恭喜！您已完成【${permitForm.role}】汽機車停車證登記申請。目前正由事務組審核中！`);
  };

  const handleEtcSubmit = (e) => {
    e.preventDefault();
    const newEntry = {
      id: `etc-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      name: etcForm.name || user?.displayName || '中正教師',
      email: user?.email || 'user@ccps.kh.edu.tw',
      role: etcForm.role,
      department: etcForm.department,
      plate1: etcForm.plate1.toUpperCase().trim(),
      plate2: '',
      relationship: '本人',
      phone: etcForm.phone,
      etcCode: '',
      status: 'PENDING',
      expiryDate: '114. 08. 31',
      academicYear: '',
      isEtcApplied: true
    };

    setPermits([newEntry, ...permits]);
    setSubmitSuccessMsg(`📡 您已送出車牌 ${etcForm.plate1.toUpperCase()} 的 ETC 內碼申請。請洽事務組補登 ETC 內碼即可生效！`);
  };

  const handleRenewSubmit = (updatedPermit) => {
    setPermits(permits.map(p => p.id === updatedPermit.id ? updatedPermit : p));
  };

  return (
    <div className="portal-container">
      {/* 頂部引導切換 Tab */}
      <div className="portal-tabs">
        <button
          onClick={() => { setPortalTab('NEW_PERMIT'); setSubmitSuccessMsg(''); }}
          className={`portal-tab-btn ${portalTab === 'NEW_PERMIT' ? 'portal-tab-active' : ''}`}
        >
          <Car size={18} />
          <span>汽機車停車證新辦</span>
        </button>
        <button
          onClick={() => { setPortalTab('ETC'); setSubmitSuccessMsg(''); }}
          className={`portal-tab-btn ${portalTab === 'ETC' ? 'portal-tab-active' : ''}`}
        >
          <Radio size={18} />
          <span>ETC 內碼登記申請</span>
        </button>
        <button
          onClick={() => { setPortalTab('RENEWAL'); setSubmitSuccessMsg(''); }}
          className={`portal-tab-btn ${portalTab === 'RENEWAL' ? 'portal-tab-active-renew' : ''}`}
        >
          <RefreshCw size={18} />
          <span>到期 1 鍵快速續辦</span>
        </button>
      </div>

      {submitSuccessMsg && (
        <div className="submit-success-box">
          <CheckCircle2 size={32} className="icon-success" />
          <div>
            <h4>申請已送出！</h4>
            <p>{submitSuccessMsg}</p>
          </div>
        </div>
      )}

      {portalTab === 'NEW_PERMIT' && (
        <div className="portal-form-wrap">
          <RulesAgreement rulesText={rulesText} agreed={agreed} setAgreed={setAgreed} />

          {!agreed ? (
            <div key="locked-permit" className="portal-card bg-gray-900/60 border-2 border-dashed border-amber-500/60 text-center py-10 px-6 my-4">
              <div className="text-amber-400 text-lg font-bold mb-2 flex items-center justify-center gap-2">
                🔒 申請表單已鎖定：請先詳讀規範
              </div>
              <p className="text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
                為確保校園安全與停車秩序，請先於上方條文視窗<strong className="text-amber-300 underline">「向下垂直捲動至最底部完成閱讀」</strong>，並點選「我已詳讀並同意」後，系統即自動解鎖並展開汽機車停車證申請登記表單。
              </p>
            </div>
          ) : (
            <form key="unlocked-permit" onSubmit={handlePermitSubmit} className="portal-card animate-fadeIn">
              <div className="card-title-row">
                <h3>🚗 汽機車停車證申請登記表單</h3>
                <span className="badge-identity">
                  {permitForm.role === '本校正職教職員工' ? '🎖️ 對應：一般汽車停車證' : '🔖 對應：臨時汽車停車證'}
                </span>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>申請人姓名</label>
                  <input
                    type="text"
                    value={permitForm.name}
                    onChange={(e) => setPermitForm({ ...permitForm, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>申請者身份別 (五大身份分類)</label>
                  <select
                    value={permitForm.role}
                    onChange={(e) => setPermitForm({ ...permitForm, role: e.target.value })}
                    className="select-input"
                  >
                    {rolesList.map(r => (
                      <option key={r.label} value={r.label}>
                        {r.label} ({r.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>申請處室 / 學年 / 單位</label>
                  <input
                    type="text"
                    value={permitForm.department}
                    onChange={(e) => setPermitForm({ ...permitForm, department: e.target.value })}
                    className="input-field"
                    placeholder="例如：教務處、三年級、弦樂團"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>手機聯絡電話 (緊急移車用)</label>
                  <input
                    type="tel"
                    value={permitForm.phone}
                    onChange={(e) => setPermitForm({ ...permitForm, phone: e.target.value })}
                    className="input-field"
                    placeholder="0912-345-678"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>車牌號碼 (第一台車 - 必填)</label>
                  <input
                    type="text"
                    value={permitForm.plate1}
                    onChange={(e) => setPermitForm({ ...permitForm, plate1: e.target.value })}
                    className="input-field uppercase"
                    placeholder="ABC-1234"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>車牌號碼 (第二台車 - 選填，可登記兩台)</label>
                  <input
                    type="text"
                    value={permitForm.plate2}
                    onChange={(e) => setPermitForm({ ...permitForm, plate2: e.target.value })}
                    className="input-field uppercase"
                    placeholder="沒有請留空"
                  />
                </div>

                <div className="form-group">
                  <label>與車主關係</label>
                  <select
                    value={permitForm.relationship}
                    onChange={(e) => setPermitForm({ ...permitForm, relationship: e.target.value })}
                    className="select-input"
                  >
                    <option value="本人">本人</option>
                    <option value="夫妻">夫妻</option>
                    <option value="直系血親">直系血親</option>
                    <option value="其他">其他</option>
                  </select>
                </div>

                <div className="form-group flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permitForm.isEtcApplied}
                      onChange={(e) => setPermitForm({ ...permitForm, isEtcApplied: e.target.checked })}
                    />
                    <span>同時申請辦理校園 ETC 門禁車牌識別</span>
                  </label>
                </div>
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  disabled={!agreed}
                  className={`btn-primary btn-xl ${!agreed ? 'btn-disabled' : ''}`}
                >
                  <span>送出汽機車停車證申請</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {portalTab === 'ETC' && (
        <div className="portal-form-wrap">
          <RulesAgreement rulesText={rulesText} agreed={agreed} setAgreed={setAgreed} />

          {!agreed ? (
            <div key="locked-etc" className="portal-card bg-gray-900/60 border-2 border-dashed border-amber-500/60 text-center py-10 px-6 my-4">
              <div className="text-amber-400 text-lg font-bold mb-2 flex items-center justify-center gap-2">
                🔒 申請表單已鎖定：請先詳讀規範
              </div>
              <p className="text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
                為確保校園安全與停車秩序，請先於上方條文視窗<strong className="text-amber-300 underline">「向下垂直捲動至最底部完成閱讀」</strong>，並點選「我已詳讀並同意」後，系統即自動解鎖並展開 ETC 車牌進出內碼登記表單。
              </p>
            </div>
          ) : (
            <form key="unlocked-etc" onSubmit={handleEtcSubmit} className="portal-card animate-fadeIn">
              <div className="card-title-row">
                <h3>📡 校園 ETC 車牌進出內碼登記</h3>
                <span className="badge-info">遠通 ETag / 校園 ETC 貼紙適用</span>
              </div>

              <div className="info-alert-box">
                <AlertCircle size={18} />
                <p>
                  <strong>ETC 內碼說明：</strong>申請後車上如有現成 ETC 貼紙或遠通 ETag，請洽事務組透過後台手動輸入補登該組內碼後，即可自動開門進出。
                </p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>申請人姓名</label>
                  <input
                    type="text"
                    value={etcForm.name}
                    onChange={(e) => setEtcForm({ ...etcForm, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>申請者身份別</label>
                  <select
                    value={etcForm.role}
                    onChange={(e) => setEtcForm({ ...etcForm, role: e.target.value })}
                    className="select-input"
                  >
                    {rolesList.map(r => (
                      <option key={r.label} value={r.label}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>申請處室 / 學年 / 單位</label>
                  <input
                    type="text"
                    value={etcForm.department}
                    onChange={(e) => setEtcForm({ ...etcForm, department: e.target.value })}
                    className="input-field"
                    placeholder="例如：教務處"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>聯絡手機號碼</label>
                  <input
                    type="tel"
                    value={etcForm.phone}
                    onChange={(e) => setEtcForm({ ...etcForm, phone: e.target.value })}
                    className="input-field"
                    placeholder="0912-345-678"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>車牌號碼 (機車 / 汽車)</label>
                  <input
                    type="text"
                    value={etcForm.plate1}
                    onChange={(e) => setEtcForm({ ...etcForm, plate1: e.target.value })}
                    className="input-field uppercase font-mono"
                    placeholder="ABC-1234"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>ETC 內碼 (唯讀 - 事務組專用)</label>
                  <input
                    type="text"
                    disabled
                    value="將由事務組掃描與核查後填入"
                    className="input-disabled"
                  />
                </div>
              </div>

              <div className="form-submit-row mt-8">
                <button type="submit" className="btn-primary btn-xl">
                  <span>送出 ETC 登記申請</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {portalTab === 'RENEWAL' && (
        <RenewalForm permits={permits} onRenewSubmit={handleRenewSubmit} />
      )}
    </div>
  );
}
