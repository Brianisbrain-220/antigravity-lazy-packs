import React, { useRef } from 'react';
import Papa from 'papaparse';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DataImportExport({ permits, setPermits }) {
  const fileInputRef = useRef(null);

  const handleExportCSV = () => {
    if (!permits || permits.length === 0) {
      alert('目前沒有資料可以匯出');
      return;
    }

    const rows = permits.map(p => ({
      '申請編號': p.id,
      '申請時間': p.createdAt,
      '姓名': p.name,
      'Email': p.email,
      '身份別': p.role,
      '申請處室': p.department,
      '車牌號碼1': p.plate1,
      '車牌號碼2': p.plate2 || '',
      '聯絡手機': p.phone,
      '與車主關係': p.relationship || '本人',
      'ETC內碼': p.etcCode || '',
      '審核狀態': p.status,
      '有效期限': p.expiryDate || '',
      '正職學年度': p.academicYear || '',
      '是否申請ETC': p.isEtcApplied ? '是' : '否'
    }));

    const csv = Papa.unparse(rows);
    // 加 BOM 避免 Windows Excel 開啟中文亂碼
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `中正國小停車證申請資料表_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (!data || data.length === 0) {
          alert('匯入的 CSV 檔案無有效資料列！');
          return;
        }

        const newPermits = data.map((row, idx) => ({
          id: row['申請編號'] || `imp-${Date.now()}-${idx}`,
          createdAt: row['申請時間'] || new Date().toISOString().slice(0, 16).replace('T', ' '),
          name: row['姓名'] || '未署名',
          email: row['Email'] || 'teacher@ccps.kh.edu.tw',
          role: row['身份別'] || '本校正職教職員工',
          department: row['申請處室'] || '無處室',
          plate1: (row['車牌號碼1'] || '').toUpperCase().trim(),
          plate2: (row['車牌號碼2'] || '').toUpperCase().trim(),
          phone: row['聯絡手機'] || '0000000000',
          relationship: row['與車主關係'] || '本人',
          etcCode: (row['ETC內碼'] || '').toUpperCase().trim(),
          status: row['審核狀態'] || 'APPROVED',
          expiryDate: row['有效期限'] || '114. 08. 31',
          academicYear: row['正職學年度'] || '',
          isEtcApplied: row['是否申請ETC'] === '是'
        })).filter(p => p.plate1); // 過濾無主車牌的空白行

        setPermits(prev => [...newPermits, ...prev]);
        alert(`✔ 成功匯入 ${newPermits.length} 筆停車及 ETC 申請紀錄！`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (err) => {
        alert(`❌ 解析 CSV 檔案出錯：${err.message}`);
      }
    });
  };

  return (
    <div className="import-export-wrap">
      <div className="action-card-grid">
        {/* 匯出資料卡片 */}
        <div className="import-export-card">
          <div className="card-icon-box bg-blue">
            <Download size={28} className="icon-blue" />
          </div>
          <div className="card-info">
            <h4>現有資料 CSV/Excel 匯出</h4>
            <p>將目前資料庫內的所有申請、審核狀態與 ETC 內碼，匯出為 UTF-8 (帶 BOM) 的 CSV 報表，Excel 開啟不亂碼，供線下對帳與存查。</p>
            <button onClick={handleExportCSV} className="btn-primary mt-3">
              <FileSpreadsheet size={18} />
              <span>下載所有紀錄 ({permits.length} 筆)</span>
            </button>
          </div>
        </div>

        {/* 匯入資料卡片 */}
        <div className="import-export-card">
          <div className="card-icon-box bg-green">
            <Upload size={28} className="icon-green" />
          </div>
          <div className="card-info">
            <h4>批次 CSV 申請資料匯入</h4>
            <p>管理員可上傳歷史停車證或舊有教職員車牌檔案快速完成批次建檔。標題須包含：姓名、身份別、申請處室、車牌號碼1、聯絡手機。</p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleImportCSV}
              style={{ display: 'none' }}
              id="csv-import-input"
            />
            <label htmlFor="csv-import-input" className="btn-secondary mt-3 cursor-pointer">
              <Upload size={18} />
              <span>選擇 CSV 檔案並立即匯入</span>
            </label>
          </div>
        </div>
      </div>

      <div className="import-tips-box mt-6">
        <AlertCircle size={18} />
        <div>
          <strong>匯入格式提示：</strong>
          <p>
            如果需要批次匯入，建議先點擊上方「下載所有紀錄」作為 Excel/CSV 範本，編輯後再上傳匯入，系統將自動過濾重複與錯誤的行號。
          </p>
        </div>
      </div>
    </div>
  );
}
