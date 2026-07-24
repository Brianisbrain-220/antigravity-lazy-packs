import React, { useState, useEffect, useRef } from 'react';
import {
  getUsers, createUser, updateUser, deleteUser, bulkImportUsers, bulkDeleteUsers,
  getCategories, createCategory, deleteCategory
} from '../db';
import { useToast } from '../ToastContext';
import * as XLSX from 'xlsx';
import PrintRegistrationForm from '../components/PrintRegistrationForm';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = 新增
  const [form, setForm] = useState({ category: '', name: '', contactName: '', email: '' });
  const [newCatName, setNewCatName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPrint, setShowPrint] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, cats] = await Promise.all([getUsers(), getCategories()]);
      setUsers(u);
      setCategories(cats);
      if (cats.length > 0) {
        setForm(f => f.category ? f : { ...f, category: cats[0].name });
      }
    } catch (e) {
      console.error(e);
      toast('載入資料失敗：' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const matchCat = filterCat === '全部' || u.category === filterCat;
    const matchSearch = !search || u.name.includes(search) || (u.contactName || '').includes(search) || (u.email || '').includes(search);
    return matchCat && matchSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    // 檢查是否有單位持有卡片
    const holdingCards = users.filter(u => selectedIds.has(u.id) && u.currentCardId);
    if (holdingCards.length > 0) {
      toast(`無法批次刪除，因為有 ${holdingCards.length} 個單位目前持有冷氣卡，請先歸還卡片。`, 'error');
      return;
    }

    if (!confirm(`⚠️ 確定要永久刪除選取的 ${selectedIds.size} 筆借用單位資料嗎？此操作無法復原！`)) return;
    
    setProcessing(true);
    try {
      await bulkDeleteUsers(Array.from(selectedIds));
      toast(`✅ 已成功刪除 ${selectedIds.size} 筆單位`, 'success');
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast('批次刪除失敗：' + e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast('請填寫名稱', 'error'); return; }
    setProcessing(true);
    try {
      if (editTarget) {
        await updateUser(editTarget.id, form);
        toast('✅ 已更新借用單位資料', 'success');
      } else {
        await createUser(form);
        toast('✅ 已新增借用單位', 'success');
      }
      setShowModal(false);
      load();
    } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
    finally { setProcessing(false); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`確定要刪除「${user.name}」嗎？若該單位目前持有卡片請先歸還。`)) return;
    try {
      await deleteUser(user.id);
      toast('已刪除', 'info');
      load();
    } catch (e) { toast('刪除失敗：' + e.message, 'error'); }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) { toast('請輸入類別名稱', 'error'); return; }
    try {
      await createCategory(newCatName.trim());
      toast('✅ 已新增類別', 'success');
      setNewCatName('');
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      toast('新增失敗：' + e.message, 'error');
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (users.some(u => u.category === catName)) {
      toast(`無法刪除「${catName}」，因為還有借用單位屬於此類別。`, 'error');
      return;
    }
    if (!confirm(`確定要刪除類別「${catName}」嗎？`)) return;
    try {
      await deleteCategory(catId);
      toast('已刪除類別', 'info');
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      toast('刪除失敗：' + e.message, 'error');
    }
  };

  // CSV/Excel 匯入
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        let rows = [];
        if (file.name.endsWith('.csv')) {
          const text = new TextDecoder('utf-8').decode(ev.target.result);
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
          rows = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/\r/g, ''));
            return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
          });
        } else {
          const wb = XLSX.read(ev.target.result, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }

        // 欄位映射：類別 category, 名稱 name, 聯絡人 contactName, 信箱 email
        const mapped = rows.map(r => ({
          category: r['類別'] || r['category'] || '臨時借用',
          name: r['名稱'] || r['name'] || r['班級'] || '',
          contactName: r['聯絡人'] || r['contactName'] || r['姓名'] || '',
          email: r['信箱'] || r['email'] || r['Email'] || ''
        })).filter(r => r.name);

        if (mapped.length === 0) { toast('檔案中沒有有效資料，請確認欄位格式', 'error'); return; }

        await bulkImportUsers(mapped);
        toast(`✅ 成功匯入 ${mapped.length} 筆借用單位`, 'success');
        load();
      } catch (err) {
        toast('匯入失敗：' + err.message, 'error');
      }
    };
    if (file.name.endsWith('.csv')) reader.readAsArrayBuffer(file);
    else reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 匯出範本
  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['類別', '名稱', '聯絡人', '信箱'],
      ['1年級', '1年1班', '王小明', 'teacher101@example.com'],
      ['2年級', '2年1班', '李大華', 'teacher201@example.com'],
      ['科任教室', '自然教室', '張老師', 'science@example.com']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '借用單位名單');
    XLSX.writeFile(wb, '冷氣卡借用單位名單範本.xlsx');
  };

  const statusBadge = { borrowing: <span className="badge badge-blue">持卡中</span>, idle: <span className="badge badge-gray">無卡</span> };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>載入中...</p></div>;

  if (showPrint) {
    return <PrintRegistrationForm users={users} categories={categories} onClose={() => setShowPrint(false)} />;
  }

  return (
    <div>
      <div className="page-header">
        <h2>👥 借用單位管理</h2>
        <p>建立、編輯借用單位與聯絡人名單，或大批匯入 Excel/CSV 檔案</p>
      </div>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '240px' }}>
            <span className="search-icon">🔍</span>
            <input className="form-input" placeholder="搜尋名稱、聯絡人..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: '140px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="全部">全部類別</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedIds.size > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete} disabled={processing}>
              🗑️ 刪除選取的 {selectedIds.size} 筆
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowCatModal(true)}>🏷️ 類別管理</button>
          <button className="btn btn-secondary" onClick={() => setShowPrint(true)}>🖨️ 列印領用表</button>
          <button className="btn btn-secondary" onClick={handleExportTemplate}>📥 下載範本</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileImport} />
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>📤 批次匯入</button>
          <button className="btn btn-primary" onClick={() => { setEditTarget(null); setForm({ category: categories[0]?.name || '', name: '', contactName: '', email: '' }); setShowModal(true); }}>
            ＋ 新增借用單位
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><p>沒有符合條件的借用單位</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>類別</th>
                <th>名稱</th>
                <th>聯絡人</th>
                <th>信箱</th>
                <th>目前卡號</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className={selectedIds.has(u.id) ? 'selected-row' : ''}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelectOne(u.id)}
                    />
                  </td>
                  <td><span className="badge badge-gray">{u.category}</span></td>
                  <td style={{ fontWeight: '600' }}>{u.name}</td>
                  <td style={{ fontSize: '12px' }}>{u.contactName || '—'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontWeight: '600' }}>
                    {u.currentCardId || '—'}
                  </td>
                  <td>{statusBadge[u.status] || <span className="badge badge-gray">{u.status}</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => {
                        setEditTarget(u);
                        setForm({ category: u.category, name: u.name, contactName: u.contactName || '', email: u.email || '' });
                        setShowModal(true);
                      }}>✏️ 編輯</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <h3>{editTarget ? '✏️ 編輯借用單位' : '➕ 新增借用單位'}</h3>
            <div className="form-group">
              <label className="form-label">類別</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">名稱（班級/單位名）</label>
              <input className="form-input" placeholder="例如：1年1班" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">聯絡人（姓名）</label>
              <input className="form-input" placeholder="例如：王小明老師" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">聯絡信箱</label>
              <input type="email" className="form-input" placeholder="teacher@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={processing}>
                {processing ? '儲存中...' : '✅ 儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <h3>🏷️ 借用類別管理</h3>
            
            {/* Add Category Form */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="輸入新類別名稱，如：幼兒園"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <button className="btn btn-primary" onClick={handleAddCategory}>＋ 新增</button>
            </div>

            {/* Category List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {categories.map(c => (
                <div key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{c.name}</span>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    style={{ padding: '4px 8px' }}
                  >
                    🗑️ 刪除
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={() => { setShowCatModal(false); load(); }}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
