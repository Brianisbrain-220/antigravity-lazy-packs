import React, { useState, useEffect } from 'react';
import { getApplications, updateApplication, deleteApplication } from '../applications_db';
import { createUser, borrowCard, getCardById } from '../db';
import { useToast } from '../ToastContext';
import { APP_VERSION } from '../config/version';
import { sendEmail } from '../utils/email';

export default function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [cardIds, setCardIds] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getApplications();
      setApps(data);
    } catch (e) {
      toast('載入申請單失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApproveClick = (app) => {
    setApproveTarget(app);
    setCardIds(Array(app.cardCount).fill(''));
  };

  const handleCardIdChange = (index, val) => {
    const newArr = [...cardIds];
    newArr[index] = val;
    setCardIds(newArr);
  };

  const submitApproval = async () => {
    // 檢查卡號是否都有填寫
    if (cardIds.some(id => !id.trim())) {
      toast('請填寫所有卡號', 'error');
      return;
    }

    setProcessing(true);
    try {
      // 1. 檢查所有卡號是否可用
      for (const cid of cardIds) {
        const card = await getCardById(cid);
        if (!card) throw new Error(`找不到卡片 ${cid}`);
        if (card.status !== 'available') throw new Error(`卡片 ${cid} 非可借用狀態 (${card.status})`);
      }

      // 2. 建立臨時單位並綁定卡片
      const applicantName = approveTarget.applicantName;
      const count = approveTarget.cardCount;
      const dueDate = approveTarget.expectedReturnDate;

      for (let i = 0; i < count; i++) {
        const suffix = count > 1 ? `-${i + 1}` : '';
        const unitName = `${applicantName}(臨時)${suffix}`;
        
        // 建立臨時借用單位
        const userId = await createUser({
          name: unitName,
          category: '臨時借用',
          contactName: applicantName,
          email: approveTarget.email
        });

        // 綁定卡片 (借出)
        await borrowCard(cardIds[i], userId, dueDate);
      }

      // 3. 更新申請單狀態
      await updateApplication(approveTarget.id, {
        status: 'approved',
        assignedCardIds: cardIds
      });

      toast('✅ 申請已核准，並成功發放卡片', 'success');
      
      // 發信通知
      try {
        await sendEmail(
          approveTarget.email,
          '✅ [中正國小冷氣卡] 您的臨時卡申請已核准',
          `<p>${approveTarget.applicantName} 您好，</p>
           <p>您申請的 <strong>${approveTarget.cardCount}</strong> 張臨時冷氣卡已經核准並準備完畢。</p>
           <p>配發的卡號為：${cardIds.join(', ')}</p>
           <p>請您於預計歸還日期前 (${approveTarget.expectedReturnDate}) 歸還，感謝您的配合！</p>`
        );
        toast('📧 已發送核准通知信給申請人', 'success');
      } catch (err) {
        toast('核准成功，但發送通知信失敗：' + err.message, 'error');
      }

      setApproveTarget(null);
      load();
    } catch (e) {
      console.error(e);
      toast('核准失敗：' + e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id, email, name) => {
    if (!confirm('確定要婉拒此申請嗎？')) return;
    setProcessing(true);
    try {
      await updateApplication(id, { status: 'rejected' });
      toast('已婉拒申請', 'success');
      
      try {
        await sendEmail(
          email,
          '❌ [中正國小冷氣卡] 臨時卡申請婉拒通知',
          `<p>${name} 您好，</p>
           <p>很抱歉，您先前提出的臨時冷氣卡申請因故已被管理員婉拒。</p>
           <p>若有任何疑問，請聯繫管理單位。</p>`
        );
        toast('📧 已發送婉拒通知信給申請人', 'success');
      } catch (err) {
        toast('已婉拒，但發送通知信失敗：' + err.message, 'error');
      }

      load();
    } catch (e) {
      toast('操作失敗', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('確定刪除此紀錄？')) return;
    await deleteApplication(id);
    load();
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">📝 臨時卡申請審核</h2>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>申請時間</th>
              <th>申請人</th>
              <th>信箱</th>
              <th>需求張數</th>
              <th>預計歸還</th>
              <th>原因</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => {
              const ts = app.createdAt?.toDate ? app.createdAt.toDate().toLocaleString() : '';
              return (
                <tr key={app.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ts}</td>
                  <td style={{ fontWeight: '600' }}>{app.applicantName}</td>
                  <td style={{ fontSize: '12px' }}>{app.email}</td>
                  <td style={{ textAlign: 'center', color: 'var(--accent-blue)', fontWeight: 'bold' }}>{app.cardCount}</td>
                  <td>{app.expectedReturnDate}</td>
                  <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={app.reason}>
                    {app.reason}
                  </td>
                  <td>
                    {app.status === 'pending' && <span className="badge badge-yellow">待審核</span>}
                    {app.status === 'approved' && <span className="badge badge-success">已核准</span>}
                    {app.status === 'rejected' && <span className="badge badge-danger">已婉拒</span>}
                  </td>
                  <td>
                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleApproveClick(app)}>✅ 核准發卡</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(app.id, app.email, app.applicantName)}>❌ 婉拒</button>
                      </div>
                    )}
                    {app.status !== 'pending' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(app.id)}>🗑️ 刪除紀錄</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {apps.length === 0 && (
              <tr><td colSpan="8" className="center-text" style={{ padding: '40px', color: 'var(--text-muted)' }}>目前沒有任何申請單</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {approveTarget && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>✅ 核准並發放冷氣卡</h3>
              <button className="close-btn" onClick={() => setApproveTarget(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>申請人 <strong>{approveTarget.applicantName}</strong> 需求 <strong>{approveTarget.cardCount}</strong> 張卡。</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                請準備好 {approveTarget.cardCount} 張可用的實體卡，並在下方掃描或輸入卡號。系統將會自動建立臨時借用單位並將卡片標記為借出。
              </p>
              
              {cardIds.map((val, idx) => (
                <div key={idx} className="form-group" style={{ marginBottom: '12px' }}>
                  <label>第 {idx + 1} 張卡片號碼</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="請掃描或輸入卡號"
                    value={val}
                    onChange={(e) => handleCardIdChange(idx, e.target.value)}
                    autoFocus={idx === 0}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setApproveTarget(null)}>取消</button>
              <button className="btn btn-primary" onClick={submitApproval} disabled={processing}>
                {processing ? '處理中...' : '確認核准並發放'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
