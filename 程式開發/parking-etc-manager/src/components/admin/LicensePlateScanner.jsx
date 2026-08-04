import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, AlertTriangle, CheckCircle2, User, Phone, Car, Edit3, RefreshCw, History, ShieldAlert } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { sendViolationNotification } from '../../utils/gasWebhook';
import { INITIAL_VIOLATION_TYPES } from '../../utils/mockData';

export default function LicensePlateScanner({ 
  permits, 
  violations, 
  setViolations,
  violationTypes = INITIAL_VIOLATION_TYPES,
  unregisteredVehicles = [],
  setUnregisteredVehicles
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // 手動或 OCR 辨識後的車牌文字
  const [plateQuery, setPlateQuery] = useState('DEF-8899');
  const [searchResult, setSearchResult] = useState(null);

  // 違規登錄多選表單
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [violationLocation, setViolationLocation] = useState('地下停車場 B1 東側');
  const [unregNote, setUnregNote] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState('');

  // 啟動攝影機
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.warn('無法開啟相機 (可能無 HTTPS 或本機鏡頭被佔用):', err);
      alert('請先在授權中允許攝影機存取，或可直接於下方「手動修改/輸入框」輸入車牌查詢！');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // 拍照並執行 Tesseract OCR 辨識
  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setOcrLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng', {
        logger: () => {} // quiet mode
      });
      // 正則過濾出英文與數字的組合
      const rawText = result.data.text || '';
      const cleanText = rawText.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
      setPlateQuery(cleanText || 'ABC-1234');
      handleSearchPlate(cleanText || 'ABC-1234');
    } catch (err) {
      console.error('OCR 辨識失敗:', err);
      alert('辨識遇到反光或陰影，請於右側文字框手動修改或重新輸入車牌！');
    } finally {
      setOcrLoading(false);
    }
  };

  // 查詢車牌歸屬與歷史外車紀錄
  const handleSearchPlate = (plateVal) => {
    const val = (plateVal || plateQuery).trim().toUpperCase();
    setPlateQuery(val);
    setNotifySuccess('');
    setSelectedViolations([]);
    setUnregNote('');

    if (!val) {
      setSearchResult(null);
      return;
    }

    // 搜尋第一車牌或第二車牌
    const matchPermit = permits.find(p => p.plate1 === val || (p.plate2 && p.plate2 === val));
    if (matchPermit) {
      setSearchResult({
        ...matchPermit,
        isPermit: true
      });
      return;
    }

    // 若非校內車牌，檢查是否在「未登錄車輛/黑名單」中
    const matchUnreg = unregisteredVehicles.find(u => u.plate === val);
    if (matchUnreg) {
      setSearchResult({
        ...matchUnreg,
        isUnregistered: true,
        isRepeat: true,
        name: '非本校登記車輛 (累犯已建檔)',
        department: '校外訪客/外車',
        phone: '無紀錄'
      });
      setUnregNote(matchUnreg.note || '');
    } else {
      // 全新未登記外車
      setSearchResult({
        isUnregistered: true,
        isNew: true,
        plate: val,
        name: '非本校登記車輛 (初次搜尋)',
        department: '校外外車/未建檔',
        phone: '無紀錄'
      });
    }
  };

  // 違規項目勾選開關
  const toggleViolationType = (item) => {
    if (selectedViolations.includes(item)) {
      setSelectedViolations(selectedViolations.filter(v => v !== item));
    } else {
      setSelectedViolations([...selectedViolations, item]);
    }
  };

  // 登錄違規並處理未登錄車牌建檔/累加
  const handleLogViolation = async () => {
    if (!searchResult) return;
    if (selectedViolations.length === 0) {
      alert('⚠️ 請在下方「違規事項多選區」至少勾選一項違規原因！');
      return;
    }

    setNotifying(true);
    const combinedReason = selectedViolations.join('；');
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // 處理未登錄車輛資料庫
    if (searchResult.isUnregistered && setUnregisteredVehicles) {
      if (searchResult.isRepeat) {
        // 舊有未登錄車輛 -> 累加違規次數
        const updatedList = unregisteredVehicles.map(item => {
          if (item.plate === searchResult.plate) {
            return {
              ...item,
              count: (item.count || 1) + 1,
              note: unregNote.trim() || item.note,
              history: [
                {
                  date: nowStr,
                  reasons: selectedViolations,
                  location: violationLocation
                },
                ...(item.history || [])
              ]
            };
          }
          return item;
        });
        setUnregisteredVehicles(updatedList);
      } else {
        // 新外車 -> 建立檔案
        const newUnreg = {
          id: `unreg-${Date.now()}`,
          plate: searchResult.plate,
          note: unregNote.trim() || '未登記車輛',
          firstSeen: nowStr,
          count: 1,
          history: [
            {
              date: nowStr,
              reasons: selectedViolations,
              location: violationLocation
            }
          ]
        };
        setUnregisteredVehicles([newUnreg, ...unregisteredVehicles]);
      }
    }

    const newVio = {
      id: `vio-${Date.now()}`,
      createdAt: nowStr,
      plate: plateQuery,
      ownerName: searchResult.name,
      phone: searchResult.phone || '無電話',
      reason: combinedReason,
      location: violationLocation,
      notified: true,
      notifyTime: nowStr
    };

    setViolations([newVio, ...violations]);

    // 發送通知 (Email / LINE / Chat)
    await sendViolationNotification({
      plate: plateQuery,
      ownerName: searchResult.name,
      phone: searchResult.phone || '無電話',
      reason: combinedReason,
      location: violationLocation,
      timestamp: nowStr
    });

    setNotifying(false);
    setNotifySuccess(`🚨 已完成違規登錄（共 ${selectedViolations.length} 項違規）及未登記外車歷程更新！通知信件與 Webhook 推播已送出！`);
    setSelectedViolations([]);
  };

  return (
    <div className="scanner-container">
      <div className="admin-header-row mb-6">
        <div>
          <h2>📷 汽機車相機 OCR 車牌辨識與違規通報區</h2>
          <p className="subtitle">
            支援手機/平板拍攝車牌 AI 辨識、手動修改查詢，以及未登錄外車建檔與累犯追蹤。
          </p>
        </div>
      </div>

      <div className="scanner-grid">
        {/* 左側：相機與 OCR 快照 */}
        <div className="camera-panel-card">
          <div className="camera-header-bar">
            <span>📷 車牌拍攝視窗</span>
            {streamActive ? (
              <button onClick={stopCamera} className="btn-secondary btn-sm">停止鏡頭</button>
            ) : (
              <button onClick={startCamera} className="btn-primary btn-sm">開啟攝影機</button>
            )}
          </div>

          <div className="video-wrap">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!streamActive && (
              <div className="video-placeholder">
                <Camera size={48} className="icon-muted" />
                <p>點擊上方「開啟攝影機」或直接於下方輸入車牌</p>
              </div>
            )}
          </div>

          <div className="camera-controls">
            <button
              onClick={captureAndRecognize}
              disabled={!streamActive || ocrLoading}
              className="btn-primary btn-lg w-full"
            >
              {ocrLoading ? (
                <>
                  <RefreshCw size={18} className="spin-icon" />
                  <span>Tesseract AI 辨識中...</span>
                </>
              ) : (
                <>
                  <Camera size={18} />
                  <span>拍攝車牌並執行 OCR 辨識</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 右側：手動修改與車主查詢結果 */}
        <div className="query-panel-card">
          <div className="query-bar">
            <label className="font-bold text-sm">手動修改 / 輸入車牌查詢 (OCR 辨識結果不好時可直接修正)：</label>
            <div className="search-plate-box">
              <input
                type="text"
                value={plateQuery}
                onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
                placeholder="例如: ABC-1234 或 ZZ-9999"
                className="plate-input-field font-mono"
              />
              <button
                onClick={() => handleSearchPlate(plateQuery)}
                className="btn-primary"
              >
                <Search size={18} />
                <span>立即查詢</span>
              </button>
            </div>
          </div>

          {/* 查詢結果區 */}
          {searchResult ? (
            <div className={`result-card ${
              searchResult.isRepeat 
                ? 'border-2 border-rose-500 bg-rose-950/30' 
                : searchResult.isUnregistered 
                ? 'result-warning' 
                : 'result-success'
            }`}>
              {/* 歷史累犯警示橫幅 */}
              {searchResult.isRepeat && (
                <div className="p-3 rounded-t bg-rose-900/80 border-b border-rose-600 flex items-center justify-between mb-3 text-white">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert size={20} className="text-amber-300 animate-pulse" />
                    <span>🚨 警示：此為已建檔之未登錄外車 / 累犯！先前曾出現過 {searchResult.count} 次</span>
                  </div>
                  <span className="text-xs bg-rose-950 px-2.5 py-0.5 rounded font-mono font-bold">
                    首次發現：{searchResult.firstSeen || '近期'}
                  </span>
                </div>
              )}

              <div className="result-header">
                <div className="flex-center-gap">
                  <Car size={22} />
                  <h4 className="text-xl font-mono">{plateQuery}</h4>
                </div>
                <span className={`status-tag ${
                  searchResult.isRepeat 
                    ? 'bg-rose-900 text-rose-200 border-rose-600' 
                    : searchResult.isUnregistered 
                    ? 'tag-warn' 
                    : 'tag-ok'
                }`}>
                  {searchResult.isRepeat 
                    ? '🚨 歷史違規外車 (累犯)' 
                    : searchResult.isUnregistered 
                    ? '⚠️ 未登記車輛 (新訪客)' 
                    : '✔ 合法登記證'}
                </span>
              </div>

              <div className="result-info-grid">
                <div className="info-item">
                  <span className="info-label"><User size={14} /> 車主姓名：</span>
                  <span className="info-val font-bold">{searchResult.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label"><Phone size={14} /> 聯絡電話：</span>
                  <span className="info-val font-bold text-blue">{searchResult.phone || '無'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">處室與身分別：</span>
                  <span className="info-val">{searchResult.department} ({searchResult.role || '未定'})</span>
                </div>
                <div className="info-item">
                  <span className="info-label">狀態 / 證件：</span>
                  <span className="info-val">
                    {searchResult.isUnregistered ? '非校內車輛' : searchResult.status === 'APPROVED' ? '已核准發給' : '待核查'}
                  </span>
                </div>
              </div>

              {/* 外車備註欄 / 歷史違規歷程卡 */}
              {searchResult.isUnregistered && (
                <div className="mt-4 p-3 rounded bg-gray-900/90 border border-gray-700/80">
                  <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                    📝 未登錄外車 — 車輛外觀 / 備註說明 (下次再查詢時即時提示)：
                  </label>
                  <input
                    type="text"
                    className="form-input text-sm w-full"
                    placeholder="例如：銀色休旅車 / 常違停東側穿堂"
                    value={unregNote}
                    onChange={(e) => setUnregNote(e.target.value)}
                  />

                  {/* 若是累犯，展開過往紀錄 */}
                  {searchResult.history && searchResult.history.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800 text-xs">
                      <div className="font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                        <History size={14} />
                        <span>歷次出現與違規紀事 ({searchResult.history.length} 筆)：</span>
                      </div>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {searchResult.history.map((h, i) => (
                          <div key={i} className="flex items-center justify-between text-gray-400 bg-gray-800/50 p-1.5 rounded">
                            <span>🕒 {h.date} | 📍 {h.location}</span>
                            <span className="text-rose-400 font-semibold">{h.reasons?.join('、') || '一般違停'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 違規事項多選勾選填報區 */}
              <div className="violation-action-box mt-4">
                <h5 className="vio-title flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>違規事項填報區 (可勾選多項)</span>
                  </div>
                  <span className="text-xs font-normal text-gray-400">
                    已勾選 {selectedViolations.length} 條違規
                  </span>
                </h5>

                {/* 違規事項 Checkboxes 網格 */}
                <div className="grid grid-cols-1 gap-2 my-3">
                  {violationTypes.map((item, idx) => {
                    const checked = selectedViolations.includes(item);
                    return (
                      <label
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleViolationType(item);
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded cursor-pointer border transition text-sm ${
                          checked
                            ? 'bg-rose-900/40 border-rose-500 text-rose-200 font-semibold'
                            : 'bg-gray-800/60 border-gray-700/80 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-rose-500 rounded"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="vio-form-row">
                  <input
                    type="text"
                    value={violationLocation}
                    onChange={(e) => setViolationLocation(e.target.value)}
                    placeholder="停放區域與地點 (例如：東側校門通道 / B1 車位 24 號)"
                    className="input-sm flex-1"
                  />
                </div>

                <button
                  onClick={handleLogViolation}
                  disabled={notifying}
                  className="btn-danger w-full mt-3"
                >
                  <AlertTriangle size={18} />
                  <span>
                    {notifying
                      ? '發送信件與 LINE 推播中...'
                      : searchResult.isUnregistered
                      ? '🚨 建檔/更新未登錄車牌並即時記錄違規通報'
                      : '🚨 記錄違規並即時發信通知車主'}
                  </span>
                </button>

                {notifySuccess && (
                  <div className="notify-success-txt mt-2">
                    {notifySuccess}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-result-box">
              <Car size={40} className="icon-muted" />
              <p>請輸入或拍攝車牌後點擊「立即查詢」，即可顯示車主、違規多選區及歷史外車累犯警示</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
