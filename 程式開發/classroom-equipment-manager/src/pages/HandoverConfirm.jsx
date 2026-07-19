import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import SignatureCanvas from 'react-signature-canvas';

function HandoverConfirm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [inventory, setInventory] = useState(null);
  const [systemSettings, setSystemSettings] = useState({ requireSignature: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [sigPad, setSigPad] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const docRef = doc(db, 'eq_inventories', id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError('找不到該筆清單');
          return;
        }
        const data = snap.data();
        if (data.handover?.token !== token) {
          setError('驗證金鑰不正確或已失效');
          return;
        }
        setInventory(data);

        // Fetch settings
        const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
        if (settingsSnap.exists()) {
          setSystemSettings(settingsSnap.data());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id && token) fetchDoc();
    else { setLoading(false); setError('無效的網址'); }
  }, [id, token]);

  const handleConfirm = async () => {
    let signatureUrl = '';
    if (systemSettings.requireSignature) {
      if (!sigPad || sigPad.isEmpty()) return alert('請在簽名區簽名');
      signatureUrl = sigPad.getTrimmedCanvas().toDataURL('image/png');
    }

    try {
      const docRef = doc(db, 'eq_inventories', id);
      await updateDoc(docRef, {
        status: 'completed',
        'handover.signatureUrl': signatureUrl,
        'handover.signedAt': new Date().toISOString()
      });
      alert('已確認交接！');
      window.location.reload();
    } catch (err) {
      alert('錯誤: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert('請填寫退回原因');
    try {
      const docRef = doc(db, 'eq_inventories', id);
      await updateDoc(docRef, {
        status: 'rejected',
        'handover.rejectReason': rejectReason,
        'handover.signedAt': new Date().toISOString()
      });
      alert('已退回給填報人！');
      window.location.reload();
    } catch (err) {
      alert('錯誤: ' + err.message);
    }
  };

  if (loading) return <div>載入中...</div>;
  if (error) return <div className="card" style={{color: 'red'}}>{error}</div>;

  const isCompleted = inventory.status === 'completed';
  const isRejected = inventory.status === 'rejected';

  return (
    <div className="card fade-in">
      <h2 style={{color: 'var(--primary)', marginBottom: '1rem'}}>交接人確認單</h2>
      
      <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
        <p><strong>班級/空間 ID:</strong> {inventory.classroomId}</p>
        <p><strong>填報人:</strong> {inventory.reporterName} ({inventory.reporterEmail})</p>
        <p><strong>交接人:</strong> {inventory.handover.name}</p>
        <p><strong>填報日期:</strong> {inventory.reportDate}</p>
      </div>

      <div style={{marginBottom: '2rem'}}>
        <h3>申報項目摘要 (唯讀)</h3>
        <ul style={{marginTop: '1rem', marginLeft: '1.5rem', lineHeight: '1.8'}}>
          {Object.entries(inventory.items).map(([itemId, data]) => (
            <li key={itemId}>
              {itemId} {data.count ? `- 數量: ${data.count}` : ''}
            </li>
          ))}
        </ul>
        <p style={{marginTop: '1rem'}}><strong>備註:</strong> {inventory.remarks || '無'}</p>
      </div>

      {isCompleted && (
        <div style={{color: 'green', fontWeight: 'bold', padding: '1rem', background: '#ecfdf5', borderRadius: '8px'}}>
          ✅ 您已於 {new Date(inventory.handover.signedAt).toLocaleString()} 完成確認。
          {inventory.handover.signatureUrl && (
            <div style={{marginTop: '1rem'}}>
              <p>簽名存檔：</p>
              <img src={inventory.handover.signatureUrl} alt="signature" style={{maxHeight: '100px', border: '1px solid #ccc'}} />
            </div>
          )}
        </div>
      )}

      {isRejected && (
        <div style={{color: 'red', fontWeight: 'bold', padding: '1rem', background: '#fef2f2', borderRadius: '8px'}}>
          ❌ 您已退回此清點單。<br/>
          原因：{inventory.handover.rejectReason}
        </div>
      )}

      {!isCompleted && !isRejected && (
        <>
          {rejectMode ? (
            <div className="form-group fade-in" style={{background: '#fef2f2', padding: '1rem', borderRadius: '8px'}}>
              <label className="form-label">退回原因</label>
              <textarea 
                className="input-field" 
                rows="3" 
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="例如：少了一把辦公椅..."
              ></textarea>
              <div className="responsive-form-row" style={{marginTop: '1rem'}}>
                <button className="btn btn-secondary" onClick={() => setRejectMode(false)}>取消</button>
                <button className="btn btn-primary" style={{background: 'red', borderColor: 'red'}} onClick={handleReject}>確認退回</button>
              </div>
            </div>
          ) : (
            <>
              {systemSettings.requireSignature && (
                <div className="form-group fade-in">
                  <label className="form-label">請在此簽名以確認設備數量無誤：</label>
                  <div className="signature-container">
                    <SignatureCanvas 
                      ref={(ref) => { setSigPad(ref) }}
                      penColor="blue"
                      canvasProps={{className: 'sigCanvas'}}
                    />
                  </div>
                  <button type="button" className="btn btn-secondary" style={{marginTop: '0.5rem', fontSize: '0.8rem'}} onClick={() => sigPad.clear()}>重新簽名</button>
                </div>
              )}
              
              <div className="responsive-form-row" style={{marginTop: '2rem'}}>
                <button className="btn btn-primary" style={{flex: 2}} onClick={handleConfirm}>
                  {systemSettings.requireSignature ? '確認無誤並簽名送出' : '確認無誤送出'}
                </button>
                <button className="btn btn-secondary" style={{flex: 1, color: 'red'}} onClick={() => setRejectMode(true)}>數量不符，退回修正</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default HandoverConfirm;
