import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Edit3, 
  Save, 
  Car, 
  Radio, 
  Send 
} from 'lucide-react';
import { sendRenewalReminderEmail } from '../../utils/gasWebhook';

export default function PermitsManager({ permits, setPermits }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingEtcId, setEditingEtcId] = useState(null);
  const [etcInputVal, setEtcInputVal] = useState('');

  const handleApprove = (id) => {
    setPermits(permits.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
  };

  const handleReject = (id) => {
    setPermits(permits.map(p => p.id === id ? { ...p, status: 'REJECTED' } : p));
  };

  const handleSaveEtc = (id) => {
    setPermits(permits.map(p => p.id === id ? { ...p, etcCode: etcInputVal.trim().toUpperCase() } : p));
    setEditingEtcId(null);
  };

  const handleSendReminder = async (permit) => {
    const res = await sendRenewalReminderEmail(permit);
    if (res.success || res.simulated) {
      alert(`✉️ 已發送「到期前 1 個月續辦提醒通知信」給 ${permit.name} (${permit.email})！`);
    } else {
      alert(`❌ 寄送失敗：${res.error}`);
    }
  };

  const filteredPermits = permits.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = !searchQuery || 
      p.name.toLowerCase().includes(q) ||
      p.plate1.toLowerCase().includes(q) ||
      (p.plate2 && p.plate2.toLowerCase().includes(q)) ||
      p.department.toLowerCase().includes(q);

    const matchRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchQ && matchRole && matchStatus;
  });

  return (
    <div className="permits-manager-card">
      <div className="manager-header">
        <div>
          <h3>車證申請審核與 ETC 內碼補登工作檯</h3>
          <p>共 {filteredPermits.length} 筆資料符合篩選條件</p>
        </div>

        <div className="filter-bar">
          <div className="search-input-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜尋姓名、車牌或處室..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">全部身份別</option>
            <option value="本校正職教職員工">本校正職教職員工 (一般證)</option>
            <option value="代理代課教師">代理代課教師 (臨時證)</option>
            <option value="外聘教師">外聘教師 (臨時證)</option>
            <option value="社團教師">社團教師 (臨時證)</option>
            <option value="志工">志工 (臨時證)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">全部審核狀態</option>
            <option value="PENDING">⏳ 待審核 (PENDING)</option>
            <option value="APPROVED">✔ 已通過 (APPROVED)</option>
            <option value="REJECTED">✘ 已退件 (REJECTED)</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="permits-table">
          <thead>
            <tr>
              <th>身分 / 申請者</th>
              <th>處室單位</th>
              <th>車牌號碼 (1 / 2)</th>
              <th>聯絡手機</th>
              <th>ETC 內碼 (手動補登)</th>
              <th>到期日 / 年度</th>
              <th>審核狀態</th>
              <th>操作與通知</th>
            </tr>
          </thead>
          <tbody>
            {filteredPermits.map((p) => {
              const isRegular = p.role === '本校正職教職員工';
              return (
                <tr key={p.id}>
                  <td>
                    <div className="user-cell">
                      <span className="font-bold">{p.name}</span>
                      <span className={`role-badge ${isRegular ? 'badge-reg' : 'badge-temp'}`}>
                        {p.role}
                      </span>
                    </div>
                  </td>
                  <td>{p.department}</td>
                  <td>
                    <div className="plate-badges">
                      <span className="plate-badge">{p.plate1}</span>
                      {p.plate2 && <span className="plate-badge-sec">{p.plate2}</span>}
                    </div>
                  </td>
                  <td>{p.phone}</td>
                  <td>
                    {editingEtcId === p.id ? (
                      <div className="etc-edit-box">
                        <input
                          type="text"
                          value={etcInputVal}
                          onChange={(e) => setEtcInputVal(e.target.value)}
                          placeholder="例如: E004123456"
                          className="input-xs font-mono"
                          autoFocus
                        />
                        <button onClick={() => handleSaveEtc(p.id)} className="btn-icon-save" title="儲存">
                          <Save size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="etc-display-box" onClick={() => { setEditingEtcId(p.id); setEtcInputVal(p.etcCode || ''); }}>
                        <span className={`etc-code-txt ${p.etcCode ? 'text-code' : 'text-muted'}`}>
                          {p.etcCode || '✎ 點此輸入補登'}
                        </span>
                        <Edit3 size={13} className="icon-edit" />
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="text-sm">
                      {isRegular ? `年度：${p.academicYear || '114'} 學年` : `到期：${p.expiryDate}`}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`status-badge-lg status-${p.status} whitespace-nowrap inline-flex items-center shrink-0`}>
                      {p.status === 'APPROVED' ? '✔ 已核准' : p.status === 'REJECTED' ? '✘ 退件' : '⏳ 待審核'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="action-buttons flex items-center flex-nowrap whitespace-nowrap">
                      {p.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="btn-approve shrink-0"
                          title="核可"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {p.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleReject(p.id)}
                          className="btn-reject shrink-0"
                          title="退件"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                      {isRegular && (
                        <button
                          onClick={() => handleSendReminder(p)}
                          className="btn-reminder whitespace-nowrap inline-flex items-center shrink-0"
                          title="手動觸發：到期前 1 個月寄信通知續辦"
                        >
                          <Send size={15} />
                          <span>續約通知</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredPermits.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  沒有符合搜尋條件的資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
