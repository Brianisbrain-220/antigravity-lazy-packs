import React, { useState } from 'react';
import { Save, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { INITIAL_RULES_TEXT } from '../../utils/mockData';

export default function RulesEditor({ rulesText, setRulesText }) {
  const [val, setVal] = useState(rulesText);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setRulesText(val);
    localStorage.setItem('ccps_parking_rules', JSON.stringify(val));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('確定要還原為中正國小預設的管理條文嗎？')) {
      setVal(INITIAL_RULES_TEXT);
      setRulesText(INITIAL_RULES_TEXT);
      localStorage.setItem('ccps_parking_rules', JSON.stringify(INITIAL_RULES_TEXT));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="rules-editor-card">
      <div className="manager-header">
        <div>
          <h3>停車管理辦法動態編輯器</h3>
          <p>修改此處內容後，前台申請者填報同意書時將自動載入您最新發布的條文</p>
        </div>

        <div className="btn-group">
          <button onClick={handleReset} className="btn-secondary">
            <RefreshCw size={16} />
            <span>還原預設條文</span>
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Save size={16} />
            <span>立即更新並發布規範</span>
          </button>
        </div>
      </div>

      {saved && (
        <div className="alert-success-banner mb-4">
          <CheckCircle2 size={18} />
          <span>✔ 新版停車管理規範已保存並正式發布至前台！</span>
        </div>
      )}

      <div className="editor-wrap">
        <label className="editor-label">條文內容 (支援 Markdown 分段與標點)：</label>
        <textarea
          rows={15}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="rules-textarea font-sans"
        />
      </div>
    </div>
  );
}
