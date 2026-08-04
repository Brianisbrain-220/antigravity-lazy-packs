import React, { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle, Search, Mail } from 'lucide-react';
import { sendViolationNotification } from '../../utils/gasWebhook';

export default function ViolationManager({ violations, setViolations }) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = violations.filter(v => 
    !query || 
    v.plate.toLowerCase().includes(query.toLowerCase()) || 
    v.ownerName.toLowerCase().includes(query.toLowerCase()) ||
    v.reason.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(v => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`確定要批次刪除選取的 ${selectedIds.length} 筆違規紀錄嗎？此操作無法復原。`)) {
      setViolations(violations.filter(v => !selectedIds.includes(v.id)));
      setSelectedIds([]);
    }
  };

  const handleResendNotify = async (v) => {
    const res = await sendViolationNotification(v);
    if (res.success || res.simulated) {
      alert(`📬 已再次發送通知信給 ${v.ownerName} (${v.phone})！`);
    } else {
      alert(`❌ 寄送失敗：${res.error}`);
    }
  };

  return (
    <div className="violations-card">
      <div className="manager-header">
        <div>
          <h3>違規紀錄通報與管理</h3>
          <p>共 {filtered.length} 筆違規登錄紀錄；支援多重選取批次刪除</p>
        </div>

        <div className="filter-bar">
          <div className="search-input-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜尋車牌、車主或違規原因..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-danger-sm">
              <Trash2 size={16} />
              <span>批次刪除選取 ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <table className="permits-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>違規時間</th>
              <th>車牌號碼</th>
              <th>車主姓名</th>
              <th>聯絡電話</th>
              <th>違規事實與區域</th>
              <th>推播通知狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id}>
                <td className="td-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(v.id)}
                    onChange={() => handleToggleSelect(v.id)}
                  />
                </td>
                <td>{v.createdAt}</td>
                <td><span className="plate-badge">{v.plate}</span></td>
                <td className="font-bold">{v.ownerName}</td>
                <td>{v.phone}</td>
                <td>
                  <div className="vio-reason-cell">
                    <strong>{v.reason}</strong>
                    <span className="text-muted"> ({v.location})</span>
                  </div>
                </td>
                <td>
                  {v.notified ? (
                    <span className="tag-ok">✔ 已發推播/Email</span>
                  ) : (
                    <span className="tag-warn">⏳ 未發送</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleResendNotify(v)}
                      className="btn-secondary-xs"
                      title="再次推播通知"
                    >
                      <Mail size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('確定刪除此筆違規紀錄？')) {
                          setViolations(violations.filter(item => item.id !== v.id));
                        }
                      }}
                      className="btn-reject"
                      title="刪除紀錄"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">沒有符合搜尋的違規紀錄</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
