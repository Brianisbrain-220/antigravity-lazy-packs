import React, { useState } from 'react';
import { Printer, Upload, CheckSquare, Square, RefreshCw, Car, Eye, Search, Users, Filter } from 'lucide-react';

export default function PermitPrinter({ permits }) {
  const [permitType, setPermitType] = useState('REGULAR'); // 'REGULAR' | 'TEMP'

  // 可自訂的學年度與有效期限 (正式員工學年度可改；臨時有效期限可改)
  const [academicYearText, setAcademicYearText] = useState('114');
  const [expiryDateText, setExpiryDateText] = useState('114. 07. 31');

  // 人員姓名/車牌快速搜尋過濾
  const [searchTerm, setSearchTerm] = useState('');

  // 自訂底圖網址 (預設使用已匯入 public/assets 的底圖)
  const [customRegularImg, setCustomRegularImg] = useState('/assets/regular_permit_template.png');
  const [customTempImg, setCustomTempImg] = useState('/assets/temp_permit_template.png');

  // 篩選出符合目前所選證件類別且已核可的清單
  const targetPermits = permits.filter(p => {
    if (p.status !== 'APPROVED') return false;
    if (permitType === 'REGULAR') {
      return p.role === '本校正職教職員工';
    } else {
      return p.role !== '本校正職教職員工';
    }
  });

  // 搜尋關鍵字過濾後的人員清單
  const displayPermits = targetPermits.filter(p => {
    if (!searchTerm.trim()) return true;
    const kw = searchTerm.trim().toLowerCase();
    return (
      p.name?.toLowerCase().includes(kw) ||
      p.plate1?.toLowerCase().includes(kw) ||
      p.department?.toLowerCase().includes(kw) ||
      p.role?.toLowerCase().includes(kw)
    );
  });

  const [selectedIds, setSelectedIds] = useState(() => targetPermits.map(p => p.id));

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(targetPermits.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectFiltered = (checked) => {
    const filteredIds = displayPermits.map(p => p.id);
    if (checked) {
      const merged = new Set([...selectedIds, ...filteredIds]);
      setSelectedIds(Array.from(merged));
    } else {
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    }
  };

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleUploadBg = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'REGULAR') setCustomRegularImg(url);
    if (type === 'TEMP') setCustomTempImg(url);
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) {
      alert('請至少勾選一筆待列印的停車證資料！');
      return;
    }
    window.print();
  };

  const selectedList = targetPermits.filter(p => selectedIds.includes(p.id));

  // 為了呈現 A4 橫式 2列4欄 (8張一頁) 的排版效果，進行分頁包裝
  const pages = [];
  for (let i = 0; i < selectedList.length; i += 8) {
    pages.push(selectedList.slice(i, i + 8));
  }
  // 若沒有任何項目也至少放一頁空的提示
  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div className="printer-page-wrap">
      {/* 僅在螢幕顯示，列印時隱藏的控制列 */}
      <div className="print-controls-panel no-print">
        <div className="manager-header">
          <div>
            <h3>A4 橫式 2列4欄 停車證雙軌底圖動態套印</h3>
            <p>可自由切換正式/臨時證、自訂學年度或有效期限，並勾選特定人員進行批次/個別套印</p>
          </div>

          <div className="btn-group">
            <button onClick={handlePrint} className="btn-primary btn-print-cta">
              <Printer size={18} />
              <span>立即列印 A4 雙軌停車證 (已勾選 {selectedIds.length} 張)</span>
            </button>
          </div>
        </div>

        <div className="printer-settings-bar">
          <div className="setting-box">
            <label>1. 選擇套印停車證種類：</label>
            <div className="toggle-type-btns">
              <button
                onClick={() => {
                  setPermitType('REGULAR');
                  setSelectedIds(permits.filter(p => p.status === 'APPROVED' && p.role === '本校正職教職員工').map(p => p.id));
                  setSearchTerm('');
                }}
                className={`type-btn ${permitType === 'REGULAR' ? 'type-btn-active' : ''}`}
              >
                <span>🎖️ 本校正職教職員工 (學年度汽車證)</span>
              </button>
              <button
                onClick={() => {
                  setPermitType('TEMP');
                  setSelectedIds(permits.filter(p => p.status === 'APPROVED' && p.role !== '本校正職教職員工').map(p => p.id));
                  setSearchTerm('');
                }}
                className={`type-btn ${permitType === 'TEMP' ? 'type-btn-active' : ''}`}
              >
                <span>🔖 代理/外聘/志工 (臨時汽車證)</span>
              </button>
            </div>
          </div>

          <div className="setting-box">
            {permitType === 'REGULAR' ? (
              <>
                <label>2. 自訂列印學年度 (正式員工專用)：</label>
                <div className="input-with-label">
                  <input
                    type="text"
                    value={academicYearText}
                    onChange={(e) => setAcademicYearText(e.target.value)}
                    className="input-sm font-bold"
                  />
                  <span>學年度</span>
                </div>
              </>
            ) : (
              <>
                <label>2. 自訂有效期限 (臨時停車證)：</label>
                <input
                  type="text"
                  value={expiryDateText}
                  onChange={(e) => setExpiryDateText(e.target.value)}
                  placeholder="例如: 114. 07. 31"
                  className="input-sm font-bold"
                />
              </>
            )}
          </div>

          <div className="setting-box">
            <label>3. 更換底圖範本 (可選)：</label>
            <div className="upload-bg-box">
              <input
                type="file"
                accept="image/*"
                id="bg-upload-input"
                style={{ display: 'none' }}
                onChange={(e) => handleUploadBg(e, permitType)}
              />
              <label htmlFor="bg-upload-input" className="btn-secondary-sm cursor-pointer">
                <Upload size={14} />
                <span>上傳更換{permitType === 'REGULAR' ? '正式證' : '臨時證'}底圖</span>
              </label>
            </div>
          </div>
        </div>

        {/* 人員名單勾選與過濾區 (Checklist Section) */}
        <div className="bg-gray-900/80 border border-gray-700/80 rounded-xl p-4 my-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Users size={18} />
              <span>
                勾選套印人員清單 — 目前總選取：
                <span className="text-white text-base font-mono underline ml-1">{selectedIds.length}</span> / {targetPermits.length} 名
              </span>
            </div>

            {/* 關鍵字搜尋盒 */}
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
              <Search size={15} className="text-gray-400" />
              <input
                type="text"
                placeholder="搜尋姓名、處室或車牌..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none w-44"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-xs text-gray-400 hover:text-white">✕</button>
              )}
            </div>
          </div>

          {/* 批次全選 / 取消按鈕列 */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-amber-200">
                <input
                  type="checkbox"
                  checked={targetPermits.length > 0 && selectedIds.length === targetPermits.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="font-semibold">全選所有符合類別者 ({targetPermits.length} 人)</span>
              </label>

              {searchTerm && displayPermits.length > 0 && (
                <button
                  onClick={() => handleSelectFiltered(true)}
                  className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold"
                >
                  全選關鍵字篩選結果 ({displayPermits.length} 人)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(targetPermits.map(p => p.id))}
                className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                全部選取
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                取消全選
              </button>
            </div>
          </div>

          {/* 勾選清單網格 (Checklist Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {displayPermits.map(p => {
              const checked = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleToggle(p.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition select-none ${
                    checked
                      ? 'bg-amber-500/15 border-amber-500/80 text-white'
                      : 'bg-gray-800/50 border-gray-700/60 text-gray-400 hover:bg-gray-800 hover:text-gray-300 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // 由上層 div 統一 onClick handleToggle
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer flex-shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-sm font-bold text-gray-100 truncate">{p.name}</div>
                      <div className="text-xs text-gray-400 truncate">{p.department} · {p.role}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-gray-950 text-amber-300 border border-gray-700">
                      {p.plate1}
                    </span>
                  </div>
                </div>
              );
            })}

            {displayPermits.length === 0 && (
              <div className="col-span-full text-center py-6 text-gray-500 text-sm">
                無符合此篩選或搜尋字詞的申請人員名單。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 列印預覽區 (A4 橫式 297mm x 210mm 容器) */}
      <div className="print-preview-section">
        <div className="preview-label no-print">
          <Eye size={18} />
          <span>列印預覽效果 (A4 橫向排列，每頁 8 張停車證；已勾選 {selectedList.length} 張)</span>
        </div>

        {pages.map((pageItems, pageIdx) => (
          <div key={pageIdx} className="a4-landscape-page">
            <div className="grid-2x4">
              {pageItems.map((p) => {
                const isReg = permitType === 'REGULAR';
                const bgImg = isReg ? customRegularImg : customTempImg;

                return (
                  <div key={p.id} className="permit-card-box">
                    <img src={bgImg} alt="底圖" className="permit-bg-img" />

                    {/* 動態文字套印覆寫層 */}
                    <div className={`permit-overlay ${isReg ? 'overlay-reg' : 'overlay-temp'}`}>
                      {isReg ? (
                        /* 正式員工：上方學年度、中間車牌 */
                        <div className="reg-text-layout">
                          <div className="reg-ac-year">{academicYearText}</div>
                          <div className="reg-plate-number">{p.plate1}</div>
                          <div className="reg-dept-sub">{p.department} - {p.name}</div>
                        </div>
                      ) : (
                        /* 臨時證：上方申請處室、中間車牌、下方有效期限 */
                        <div className="temp-text-layout">
                          <div className="temp-department">{p.department} - {p.name}</div>
                          <div className="temp-plate-number">{p.plate1}</div>
                          <div className="temp-expiry-date">{expiryDateText}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 補足該頁不滿 8 格的空白卡片，保持排版平衡 */}
              {Array.from({ length: Math.max(0, 8 - pageItems.length) }).map((_, emptyIdx) => (
                <div key={`empty-${emptyIdx}`} className="permit-card-box empty-card-slot">
                  <div className="empty-slot-text">
                    <span>未套印空位</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
