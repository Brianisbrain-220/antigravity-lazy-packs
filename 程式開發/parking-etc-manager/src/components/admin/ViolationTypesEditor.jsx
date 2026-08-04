import React, { useState } from 'react';
import { INITIAL_VIOLATION_TYPES } from '../../utils/mockData';

export default function ViolationTypesEditor({ violationTypes, setViolationTypes }) {
  const [newItem, setNewItem] = useState('');
  const [feedback, setFeedback] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (violationTypes.includes(trimmed)) {
      setFeedback({ type: 'err', msg: '此違規事項已存在！' });
      return;
    }
    setViolationTypes([...violationTypes, trimmed]);
    setNewItem('');
    setFeedback({ type: 'ok', msg: '✔ 已新增違規事項條目！' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (indexToDelete) => {
    if (violationTypes.length <= 1) {
      alert('至少需保留 1 個違規事項選項！');
      return;
    }
    const target = violationTypes[indexToDelete];
    if (!window.confirm(`確定要刪除「${target}」嗎？`)) return;
    const updated = violationTypes.filter((_, idx) => idx !== indexToDelete);
    setViolationTypes(updated);
    setFeedback({ type: 'ok', msg: '✔ 已刪除該違規事項！' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReset = () => {
    if (!window.confirm('確定要還原預設的 5 項校園違規類別嗎？')) return;
    setViolationTypes(INITIAL_VIOLATION_TYPES);
    setFeedback({ type: 'ok', msg: '✔ 已還原為預設違規類別清單。' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="admin-card">
      <div className="card-header flex justify-between items-center">
        <div>
          <h3 className="card-title">⚠️ 違規事項類別管理</h3>
          <p className="text-sm text-gray-400 mt-1">
            設定相機 OCR 辨識與手動填報違規時可供選擇的 Checkboxes 選項，全校同步適用。
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary text-xs"
        >
          🔄 還原預設類別
        </button>
      </div>

      <div className="card-body">
        {feedback && (
          <div
            className={`p-3 rounded mb-4 text-sm font-semibold ${
              feedback.type === 'ok'
                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-600'
                : 'bg-rose-900/50 text-rose-300 border border-rose-600'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            className="form-input flex-1"
            placeholder="輸入新違規事項名稱（例如：車位占用且未掛車證）"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            + 新增違規事項
          </button>
        </form>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 mb-2">
            現有違規事項清單（共 {violationTypes.length} 項）：
          </div>
          {violationTypes.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded bg-gray-800/60 border border-gray-700/60 hover:border-gray-600 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-200">{item}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="text-rose-400 hover:text-rose-300 text-xs px-3 py-1 rounded bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 transition"
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
