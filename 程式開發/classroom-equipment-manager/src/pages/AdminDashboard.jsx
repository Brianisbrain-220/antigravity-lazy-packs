import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { seedEquipmentItems, seedClassrooms } from '../seedData';

function AdminDashboard() {
  const { user } = useAuth();
  
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  const [inventories, setInventories] = useState([]);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ requireSignature: true, googleChatWebhookUrl: '' });
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'items' | 'classrooms' | 'settings'
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({ requireSignature: true, googleChatWebhookUrl: '' });

  // Classroom Form State
  const [classroomForm, setClassroomForm] = useState({
    id: '',
    name: '',
    category: 'regular', // 'regular' or 'special'
    teacherName: '',
    teacherEmail: ''
  });

  // Equipment Item Form State
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    id: '',
    name: '',
    category: 'desks_chairs',
    inputType: 'checkbox_only',
    imageUrl: '',
    sortOrder: 50
  });

  const categories = {
    desks_chairs: '課桌椅',
    lockers: '學生置物櫃',
    office_desks: '辦公桌',
    office_chairs: '辦公椅',
    multimedia: '多媒體與週邊',
    amplifiers: '擴音設備',
    speakers: '喇叭',
    erasers: '板擦機'
  };

  // Verify Admin
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user?.email) {
        setIsAdminVerified(false);
        setCheckingAdmin(false);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email));
        setIsAdminVerified(adminDoc.exists());
      } catch (err) {
        console.error("Admin verification failed:", err);
        setIsAdminVerified(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    verifyAdmin();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch inventories
      const invSnap = await getDocs(collection(db, 'eq_inventories'));
      const invs = invSnap.docs.map(d => ({id: d.id, ...d.data()}));
      setInventories(invs);

      // Fetch items
      const itemSnap = await getDocs(collection(db, 'eq_items'));
      setEquipmentItems(itemSnap.docs.map(d => ({id: d.id, ...d.data()})).sort((a, b) => a.sortOrder - b.sortOrder));

      // Fetch classrooms
      const clsSnap = await getDocs(collection(db, 'eq_classrooms'));
      setClassrooms(clsSnap.docs.map(d => ({id: d.id, ...d.data()})));

      // Fetch settings
      const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSystemSettings(data);
        setSettingsForm(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminVerified) {
      loadData();
    }
  }, [isAdminVerified]);

  // Seeding
  const handleForceSeed = async () => {
    if (!confirm('此操作將會重新覆蓋並導入預設的 35 個設備項目及班級，確定要執行嗎？')) return;
    try {
      setLoading(true);
      await seedEquipmentItems(true);
      await seedClassrooms(true);
      alert('已成功還原預設資料！');
      loadData();
    } catch (err) {
      alert('還原失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'eq_settings', 'global'), settingsForm);
      alert('設定儲存成功！');
      loadData();
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    }
  };

  // Save Classroom
  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    if (!classroomForm.name || !classroomForm.teacherEmail) return alert('請填寫完整資訊');
    try {
      const clsId = classroomForm.id || 'room_' + Date.now();
      const clsData = {
        id: clsId,
        name: classroomForm.name,
        category: classroomForm.category,
        teacherName: classroomForm.teacherName,
        teacherEmail: classroomForm.teacherEmail
      };
      await setDoc(doc(db, 'eq_classrooms', clsId), clsData);
      alert(classroomForm.id ? '修改成功！' : '新增成功！');
      setClassroomForm({ id: '', name: '', category: 'regular', teacherName: '', teacherEmail: '' });
      loadData();
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    }
  };

  // Delete Classroom
  const handleDeleteClassroom = async (clsId) => {
    if (!confirm('確定要刪除此空間嗎？')) return;
    try {
      await deleteDoc(doc(db, 'eq_classrooms', clsId));
      alert('已成功刪除');
      loadData();
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  // Save Equipment Item
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name) return alert('請輸入名稱');
    try {
      const itemId = editingItem ? itemForm.id : 'item_' + Date.now();
      const itemData = {
        id: itemId,
        name: itemForm.name,
        category: itemForm.category,
        inputType: itemForm.inputType,
        imageUrl: itemForm.imageUrl || '',
        sortOrder: parseInt(itemForm.sortOrder) || 50
      };
      await setDoc(doc(db, 'eq_items', itemId), itemData);
      alert(editingItem ? '修改成功！' : '新增成功！');
      setEditingItem(null);
      setItemForm({ id: '', name: '', category: 'desks_chairs', inputType: 'checkbox_only', imageUrl: '', sortOrder: 50 });
      loadData();
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('確定要刪除此設備項目嗎？')) return;
    try {
      await deleteDoc(doc(db, 'eq_items', itemId));
      alert('已成功刪除');
      loadData();
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  // Compute Classroom Handover Status
  const getClassroomStatus = (clsId) => {
    const clsInvs = inventories.filter(i => i.classroomId === clsId);
    if (clsInvs.length === 0) return { label: '未填報', color: '#64748b' };
    
    // Find the latest inventory submitted
    const latest = clsInvs.reduce((prev, current) => {
      return (new Date(prev.submittedAt) > new Date(current.submittedAt)) ? prev : current;
    });

    if (latest.status === 'completed') {
      return { label: '交接完成', color: '#10b981', latest };
    } else if (latest.status === 'pending_handover') {
      return { label: '待交接確認', color: '#f59e0b', latest };
    } else if (latest.status === 'rejected') {
      return { label: '遭退回修正', color: '#ef4444', latest };
    }
    return { label: '未知', color: '#64748b' };
  };

  const handleRemind = () => {
    alert('已成功模擬發送 Google Chat Webhook 與 Email 催報通知！\n介面 Webhook 網址為：' + (systemSettings.googleChatWebhookUrl || '未設定'));
  };

  if (checkingAdmin) return <div style={{textAlign: 'center', padding: '3rem'}}>驗證權限中...</div>;

  if (!isAdminVerified) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem 2rem', borderColor: 'red' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '1.5rem', color: '#ef4444' }}>存取遭拒</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            帳號 <strong>{user?.email}</strong> 尚未被授權進入管理後台。<br/>
            請聯絡系統管理員將您加入白名單。
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{textAlign: 'center', padding: '3rem'}}>載入後台數據中...</div>;

  const completedCount = inventories.filter(i => i.status === 'completed').length;
  const pendingCount = inventories.filter(i => i.status === 'pending_handover').length;
  const rejectedCount = inventories.filter(i => i.status === 'rejected').length;

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
        <h2>管理後台看板</h2>
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          <button className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('summary')}>數據總覽</button>
          <button className={`btn ${activeTab === 'classrooms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('classrooms')}>管理空間/班級 ({classrooms.length})</button>
          <button className={`btn ${activeTab === 'items' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('items')}>管理設備項目 ({equipmentItems.length})</button>
          <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('settings')}>系統與通知設定</button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem'}}>
            <button className="btn btn-primary" onClick={handleRemind}>
              發送全校催報通知 (Google Chat / Email)
            </button>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
            <div className="card" style={{marginBottom: 0, textAlign: 'center', borderColor: '#10b981'}}>
              <h3 style={{fontSize: '2.5rem', color: '#10b981'}}>{completedCount}</h3>
              <p>已完成清點/交接</p>
            </div>
            <div className="card" style={{marginBottom: 0, textAlign: 'center', borderColor: '#f59e0b'}}>
              <h3 style={{fontSize: '2.5rem', color: '#f59e0b'}}>{pendingCount}</h3>
              <p>待交接人確認</p>
            </div>
            <div className="card" style={{marginBottom: 0, textAlign: 'center', borderColor: '#ef4444'}}>
              <h3 style={{fontSize: '2.5rem', color: '#ef4444'}}>{rejectedCount}</h3>
              <p>遭退回修改</p>
            </div>
          </div>

          <div className="card">
            <h3>近期填報紀錄明細</h3>
            <table style={{width: '100%', marginTop: '1rem', borderCollapse: 'collapse', textAlign: 'left'}}>
              <thead>
                <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                  <th style={{padding: '0.75rem'}}>班級</th>
                  <th style={{padding: '0.75rem'}}>填報人</th>
                  <th style={{padding: '0.75rem'}}>日期</th>
                  <th style={{padding: '0.75rem'}}>模式</th>
                  <th style={{padding: '0.75rem'}}>狀態</th>
                  <th style={{padding: '0.75rem'}}>備註說明</th>
                </tr>
              </thead>
              <tbody>
                {inventories.map(inv => (
                  <tr key={inv.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={{padding: '0.75rem'}}>{inv.classroomId}</td>
                    <td style={{padding: '0.75rem'}}>{inv.reporterName}</td>
                    <td style={{padding: '0.75rem'}}>{inv.reportDate}</td>
                    <td style={{padding: '0.75rem'}}>{inv.hasHandover === false ? '獨立填報' : '雙人交接'}</td>
                    <td style={{padding: '0.75rem'}}>
                      {inv.status === 'completed' && <span style={{color: '#10b981', fontWeight: 'bold'}}>已完成</span>}
                      {inv.status === 'pending_handover' && <span style={{color: '#f59e0b', fontWeight: 'bold'}}>待確認</span>}
                      {inv.status === 'rejected' && <span style={{color: '#ef4444', fontWeight: 'bold'}}>遭退回</span>}
                    </td>
                    <td style={{padding: '0.75rem', fontSize: '0.9rem', color: '#64748b'}}>{inv.remarks || '無'}</td>
                  </tr>
                ))}
                {inventories.length === 0 && (
                  <tr><td colSpan="6" style={{padding: '1rem', textAlign: 'center', color: '#64748b'}}>尚無填報紀錄</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'classrooms' && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
          {/* Add/Edit Form */}
          <div className="card" style={{height: 'fit-content'}}>
            <h3>{classroomForm.id ? '修改班級/空間' : '新增班級/空間'}</h3>
            <form onSubmit={handleSaveClassroom} style={{marginTop: '1rem'}}>
              <div className="form-group">
                <label className="form-label">代碼/編號</label>
                <input 
                  className="input-field" 
                  required 
                  disabled={!!classroomForm.id}
                  style={classroomForm.id ? {background: '#e2e8f0', cursor: 'not-allowed'} : {}}
                  value={classroomForm.name} 
                  onChange={e => setClassroomForm({...classroomForm, name: e.target.value, id: e.target.value})}
                  placeholder="例如：一年3班 或 room_103"
                />
              </div>
              <div className="form-group">
                <label className="form-label">空間類別</label>
                <select 
                  className="input-field"
                  value={classroomForm.category}
                  onChange={e => setClassroomForm({...classroomForm, category: e.target.value})}
                >
                  <option value="regular">普通班級教室</option>
                  <option value="special">專科教室/辦公處室</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">負責教師姓名</label>
                <input 
                  className="input-field" 
                  required 
                  value={classroomForm.teacherName} 
                  onChange={e => setClassroomForm({...classroomForm, teacherName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">負責教師 Email (催報用)</label>
                <input 
                  type="email"
                  className="input-field" 
                  required 
                  value={classroomForm.teacherEmail} 
                  onChange={e => setClassroomForm({...classroomForm, teacherEmail: e.target.value})}
                />
              </div>
              
              <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                <button type="submit" className="btn btn-primary" style={{flex: 1}}>儲存</button>
                {classroomForm.id && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setClassroomForm({ id: '', name: '', category: 'regular', teacherName: '', teacherEmail: '' })}
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List with Handover Status */}
          <div className="card">
            <h3>空間列表與交接進度</h3>
            <div style={{maxHeight: '600px', overflowY: 'auto', marginTop: '1rem'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                <thead>
                  <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                    <th style={{padding: '0.5rem'}}>空間編號</th>
                    <th style={{padding: '0.5rem'}}>負責教師</th>
                    <th style={{padding: '0.5rem'}}>交接進度狀態</th>
                    <th style={{padding: '0.5rem'}}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map(cls => {
                    const status = getClassroomStatus(cls.id);
                    return (
                      <tr key={cls.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                        <td style={{padding: '0.5rem', fontWeight: 'bold'}}>{cls.name}</td>
                        <td style={{padding: '0.5rem'}}>{cls.teacherName} ({cls.teacherEmail})</td>
                        <td style={{padding: '0.5rem'}}>
                          <span style={{color: status.color, fontWeight: 'bold'}}>{status.label}</span>
                          {status.latest && <div style={{fontSize: '11px', color: '#94a3b8'}}>最後填報: {status.latest.reportDate}</div>}
                        </td>
                        <td style={{padding: '0.5rem'}}>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.3rem'}}
                            onClick={() => setClassroomForm(cls)}
                          >
                            修改
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'red'}}
                            onClick={() => handleDeleteClassroom(cls.id)}
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem'}}>
            <button className="btn btn-secondary" onClick={handleForceSeed} style={{borderColor: '#ef4444', color: '#ef4444'}}>
              ⚠️ 還原/重灌預設的 35 個設備與圖片項目
            </button>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
            <div className="card" style={{height: 'fit-content'}}>
              <h3>{editingItem ? '修改設備項目' : '新增設備項目'}</h3>
              <form onSubmit={handleSaveItem} style={{marginTop: '1rem'}}>
                <div className="form-group">
                  <label className="form-label">設備名稱</label>
                  <input 
                    className="input-field" 
                    required 
                    value={itemForm.name} 
                    onChange={e => setItemForm({...itemForm, name: e.target.value})}
                    placeholder="例如：課桌椅樣式 9"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">類別</label>
                  <select 
                    className="input-field"
                    value={itemForm.category}
                    onChange={e => setItemForm({...itemForm, category: e.target.value})}
                  >
                    {Object.entries(categories).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">填報方式</label>
                  <select 
                    className="input-field"
                    value={itemForm.inputType}
                    onChange={e => setItemForm({...itemForm, inputType: e.target.value})}
                  >
                    <option value="checkbox_only">僅勾選 (有無)</option>
                    <option value="checkbox_with_quantity">勾選 + 填寫數量</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">示意圖片網址 / 路徑</label>
                  <input 
                    className="input-field" 
                    value={itemForm.imageUrl} 
                    onChange={e => setItemForm({...itemForm, imageUrl: e.target.value})}
                    placeholder="/src/assets/images/equipment/..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">排序權重 (越小越前面)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={itemForm.sortOrder} 
                    onChange={e => setItemForm({...itemForm, sortOrder: e.target.value})}
                  />
                </div>
                
                <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                  <button type="submit" className="btn btn-primary" style={{flex: 1}}>儲存</button>
                  {editingItem && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setEditingItem(null);
                        setItemForm({ id: '', name: '', category: 'desks_chairs', inputType: 'checkbox_only', imageUrl: '', sortOrder: 50 });
                      }}
                    >
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <h3>設備項目列表</h3>
              <div style={{maxHeight: '600px', overflowY: 'auto', marginTop: '1rem'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                      <th style={{padding: '0.5rem'}}>排序</th>
                      <th style={{padding: '0.5rem'}}>圖片</th>
                      <th style={{padding: '0.5rem'}}>設備名稱</th>
                      <th style={{padding: '0.5rem'}}>類別</th>
                      <th style={{padding: '0.5rem'}}>方式</th>
                      <th style={{padding: '0.5rem'}}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentItems.map(item => (
                      <tr key={item.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                        <td style={{padding: '0.5rem'}}>{item.sortOrder}</td>
                        <td style={{padding: '0.5rem'}}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" style={{width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', background: '#f1f5f9'}} />
                          ) : (
                            <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>無</span>
                          )}
                        </td>
                        <td style={{padding: '0.5rem', fontWeight: 'bold'}}>{item.name}</td>
                        <td style={{padding: '0.5rem', fontSize: '0.9rem'}}>{categories[item.category] || item.category}</td>
                        <td style={{padding: '0.5rem', fontSize: '0.9rem'}}>
                          {item.inputType === 'checkbox_with_quantity' ? '勾選+數量' : '僅勾選'}
                        </td>
                        <td style={{padding: '0.5rem'}}>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.3rem'}}
                            onClick={() => handleEditClick(item)}
                          >
                            修改
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'red'}}
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
          <h3>系統與通知設定</h3>
          <form onSubmit={handleSaveSettings} style={{marginTop: '1.5rem'}}>
            <div className="form-group" style={{background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold'}}>
                <input 
                  type="checkbox" 
                  checked={settingsForm.requireSignature} 
                  onChange={e => setSettingsForm({...settingsForm, requireSignature: e.target.checked})}
                  style={{width: '1.25rem', height: '1.25rem'}}
                />
                強制要求電子簽名 (開啟後填報人/交接人均必須手寫簽署)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Google Chat Webhook 網址</label>
              <input 
                type="url"
                className="input-field" 
                value={settingsForm.googleChatWebhookUrl} 
                onChange={e => setSettingsForm({...settingsForm, googleChatWebhookUrl: e.target.value})}
                placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
              />
              <p style={{fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem'}}>
                用於發送催報卡片至 Google Chat 空間。
              </p>
            </div>

            <div style={{marginTop: '2rem', textAlign: 'center'}}>
              <button type="submit" className="btn btn-primary" style={{padding: '0.75rem 3rem'}}>
                儲存設定
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
