import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

function AdminDashboard() {
  const [inventories, setInventories] = useState([]);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'items'
  
  // Form state for creating/editing equipment
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

  const loadData = async () => {
    try {
      const invSnap = await getDocs(collection(db, 'eq_inventories'));
      setInventories(invSnap.docs.map(d => ({id: d.id, ...d.data()})));

      const itemSnap = await getDocs(collection(db, 'eq_items'));
      setEquipmentItems(itemSnap.docs.map(d => ({id: d.id, ...d.data()})).sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemind = () => {
    alert('已成功模擬發送 Google Chat Webhook 與 Email 催報通知！');
  };

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

  const handleEditClick = (item) => {
    setEditingItem(item.id);
    setItemForm(item);
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

  if (loading) return <div>載入中...</div>;

  const completed = inventories.filter(i => i.status === 'completed');
  const pending = inventories.filter(i => i.status === 'pending_handover');
  const rejected = inventories.filter(i => i.status === 'rejected');

  return (
    <div className="fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2>管理後台看板</h2>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button 
            className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setActiveTab('summary')}
          >
            數據總覽
          </button>
          <button 
            className={`btn ${activeTab === 'items' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setActiveTab('items')}
          >
            管理設備項目 ({equipmentItems.length})
          </button>
        </div>
      </div>

      {activeTab === 'summary' ? (
        <>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem'}}>
            <button className="btn btn-primary" onClick={handleRemind}>
              發送全校催報通知 (Google Chat / Email)
            </button>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
            <div className="card" style={{marginBottom: 0, textAlign: 'center', borderColor: '#10b981'}}>
              <h3 style={{fontSize: '2.5rem', color: '#10b981'}}>{completed.length}</h3>
              <p>已完成清點/交接</p>
            </div>
            <div className="card" style={{marginBottom: 0, textAlign: 'center', borderColor: '#f59e0b'}}>
              <h3 style={{fontSize: '2.5rem', color: '#f59e0b'}}>{pending.length}</h3>
              <p>待交接人確認</p>
            </div>
            <div className="card" style={{marginBottom: 0, textAlign: 'center', borderColor: '#ef4444'}}>
              <h3 style={{fontSize: '2.5rem', color: '#ef4444'}}>{rejected.length}</h3>
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
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
          {/* Form */}
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

          {/* List */}
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
      )}
    </div>
  );
}

export default AdminDashboard;
