import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { seedEquipmentItems, seedClassrooms, DEFAULT_CATEGORIES } from '../seedData';

const PRESET_EQUIPMENT_IMAGES = [
  { name: '1.塑膠抽屜_新式', url: '/images/equipment/page_1_1_Image21.jpg' },
  { name: '2.鐵製抽屜_新式', url: '/images/equipment/page_1_2_Image22.jpg' },
  { name: '3.木頭桌椅', url: '/images/equipment/page_1_3_Image23.jpg' },
  { name: '4.局補助_可調式', url: '/images/equipment/page_1_4_Image24.jpg' },
  { name: '5.舊款_可調式', url: '/images/equipment/page_1_5_Image25.jpg' },
  { name: '6.桌椅樣式6', url: '/images/equipment/page_1_6_Image26.jpg' },
  { name: '7.圓凳樣式7', url: '/images/equipment/page_1_7_Image27.jpg' },
  { name: '8.圓凳樣式8', url: '/images/equipment/page_1_8_Image28.jpg' },
  { name: '置物櫃_紅藍', url: '/images/equipment/page_1_9_Image29.jpg' },
  { name: '置物櫃_塑膠', url: '/images/equipment/page_1_10_Image30.jpg' },
  { name: '置物櫃_深綠', url: '/images/equipment/page_1_11_Image31.jpg' },
  { name: '置物櫃_淺綠', url: '/images/equipment/page_1_12_Image32.jpg' },
  { name: '置物櫃_不鏽鋼', url: '/images/equipment/page_1_13_Image33.jpg' },
  { name: '辦公桌 1', url: '/images/equipment/page_1_14_Image34.jpg' },
  { name: '辦公桌 2', url: '/images/equipment/page_1_15_Image35.jpg' },
  { name: '辦公桌 3', url: '/images/equipment/page_1_16_Image36.jpg' },
  { name: '辦公桌 4', url: '/images/equipment/page_1_17_Image37.jpg' },
  { name: '辦公桌 5', url: '/images/equipment/page_1_18_Image38.jpg' },
  { name: '辦公椅 1', url: '/images/equipment/page_1_19_Image39.jpg' },
  { name: '辦公椅 2', url: '/images/equipment/page_1_20_Image40.jpg' },
  { name: '木椅', url: '/images/equipment/page_1_21_Image41.jpg' },
  { name: '藤椅', url: '/images/equipment/page_1_22_Image42.jpg' },
  { name: '窗簾_有', url: '/images/equipment/page_2_1_Image45.jpg' },
  { name: '講桌_1', url: '/images/equipment/page_2_2_Image46.jpg' },
  { name: '講桌_2', url: '/images/equipment/page_2_3_Image47.jpg' },
  { name: '擴音機 1', url: '/images/equipment/page_2_4_Image48.jpg' },
  { name: '擴音機 2', url: '/images/equipment/page_2_5_Image49.jpg' },
  { name: '擴音機 3', url: '/images/equipment/page_2_6_Image50.jpg' },
  { name: '擴音機 4', url: '/images/equipment/page_2_7_Image51.jpg' },
  { name: '喇叭 1', url: '/images/equipment/page_2_8_Image52.jpg' },
  { name: '喇叭 2', url: '/images/equipment/page_2_9_Image53.jpg' },
  { name: '喇叭 3', url: '/images/equipment/page_2_10_Image54.jpg' },
  { name: '喇叭 4', url: '/images/equipment/page_2_11_Image55.jpg' },
  { name: '板擦機 1', url: '/images/equipment/page_2_12_Image56.jpg' },
  { name: '板擦機 2', url: '/images/equipment/page_2_13_Image57.jpg' }
];

function AdminDashboard() {
  const { user } = useAuth();
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [inventories, setInventories] = useState([]);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [settingsForm, setSettingsForm] = useState({ requireSignature: true, googleChatWebhookUrl: '', senderEmail: '' });
  const [systemSettings, setSystemSettings] = useState({ requireSignature: true, googleChatWebhookUrl: '', senderEmail: '' });
  const [classroomForm, setClassroomForm] = useState({ id: '', name: '', category: 'regular', teacherName: '', teacherEmail: '' });
  const csvInputRef = useRef(null);
  const itemCsvInputRef = useRef(null);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ id: '', name: '', category: 'desks_chairs', inputType: 'checkbox_only', imageUrl: '', sortOrder: 50 });
  // Audit Tab States
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditItem, setAuditItem] = useState('all');
  const [auditClassroomType, setAuditClassroomType] = useState('all');
  const [auditStatus, setAuditStatus] = useState('all');
  const [showZeroQuantity, setShowZeroQuantity] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedAuditRows, setSelectedAuditRows] = useState([]);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const customImgInputRef = useRef(null);

  const handleUploadCustomImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 180;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setItemForm(prev => ({ ...prev, imageUrl: compressedDataUrl }));
        setShowImagePickerModal(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user?.email) { setIsAdminVerified(false); setCheckingAdmin(false); return; }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email));
        setIsAdminVerified(adminDoc.exists());
      } catch (err) {
        console.error('Admin verification failed:', err);
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
      const invSnap = await getDocs(collection(db, 'eq_inventories'));
      setInventories(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const itemSnap = await getDocs(collection(db, 'eq_items'));
      setEquipmentItems(itemSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.sortOrder - b.sortOrder));
      const clsSnap = await getDocs(collection(db, 'eq_classrooms'));
      setClassrooms(clsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSystemSettings(data);
        setSettingsForm({ requireSignature: data.requireSignature ?? true, googleChatWebhookUrl: data.googleChatWebhookUrl ?? '', senderEmail: data.senderEmail ?? '' });
        if (data.categories) setCategories(data.categories);
      }
      const adminsSnap = await getDocs(collection(db, 'admins'));
      setAdmins(adminsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdminVerified) loadData(); }, [isAdminVerified]);

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

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
      const existing = settingsSnap.exists() ? settingsSnap.data() : {};
      await setDoc(doc(db, 'eq_settings', 'global'), { ...existing, ...settingsForm });
      alert('設定儲存成功！');
      loadData();
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    try {
      await setDoc(doc(db, 'admins', newAdminEmail.trim()), { email: newAdminEmail.trim(), addedAt: new Date().toISOString() });
      setNewAdminEmail('');
      loadData();
    } catch (err) {
      alert('新增失敗: ' + err.message);
    }
  };

  const handleRemoveAdmin = async (email) => {
    if (email === user.email) return alert('不能刪除自己的管理員帳號！');
    if (!confirm('確定要移除此管理員帳號嗎？')) return;
    try {
      await deleteDoc(doc(db, 'admins', email));
      loadData();
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatKey.trim() || !newCatLabel.trim()) return alert('請輸入類別代碼與名稱');
    const key = newCatKey.trim().replace(/\s+/g, '_');
    const updated = { ...categories, [key]: newCatLabel.trim() };
    try {
      const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
      const existing = settingsSnap.exists() ? settingsSnap.data() : {};
      await setDoc(doc(db, 'eq_settings', 'global'), { ...existing, categories: updated });
      setCategories(updated);
      setNewCatKey(''); setNewCatLabel('');
    } catch (err) {
      alert('新增類別失敗: ' + err.message);
    }
  };

  const handleDeleteCategory = async (key) => {
    if (!confirm('確定要刪除類別「' + categories[key] + '」嗎？')) return;
    const updated = { ...categories };
    delete updated[key];
    try {
      const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
      const existing = settingsSnap.exists() ? settingsSnap.data() : {};
      await setDoc(doc(db, 'eq_settings', 'global'), { ...existing, categories: updated });
      setCategories(updated);
    } catch (err) {
      alert('刪除類別失敗: ' + err.message);
    }
  };

  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    if (!classroomForm.name || !classroomForm.teacherEmail) return alert('請填寫完整資訊');
    try {
      const clsId = classroomForm.id || 'room_' + Date.now();
      await setDoc(doc(db, 'eq_classrooms', clsId), { id: clsId, name: classroomForm.name, category: classroomForm.category, teacherName: classroomForm.teacherName, teacherEmail: classroomForm.teacherEmail });
      alert(classroomForm.id ? '修改成功！' : '新增成功！');
      setClassroomForm({ id: '', name: '', category: 'regular', teacherName: '', teacherEmail: '' });
      loadData();
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    }
  };

  const handleDeleteClassroom = async (clsId) => {
    if (!confirm('確定要刪除此空間嗎？')) return;
    try {
      await deleteDoc(doc(db, 'eq_classrooms', clsId));
      loadData();
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('代碼'));
      let successCount = 0;
      let errCount = 0;
      for (const line of lines) {
        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 5) { errCount++; continue; }
        const [id, name, category, teacherName, teacherEmail] = cols;
        if (!id || !name || !teacherEmail) { errCount++; continue; }
        try {
          await setDoc(doc(db, 'eq_classrooms', id), { id, name, category: category || 'regular', teacherName: teacherName || '', teacherEmail });
          successCount++;
        } catch (err) {
          errCount++;
        }
      }
      alert('匯入完成！成功 ' + successCount + ' 筆' + (errCount > 0 ? '，失敗 ' + errCount + ' 筆（格式錯誤）' : ''));
      loadData();
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleDownloadClassroomTemplate = () => {
    const csvContent = "\uFEFF" +
      "代碼,空間名稱,regular/special,負責教師姓名,負責教師Email\n" +
      "101,一年1班,regular,王小明,wang@cjps.kh.edu.tw\n" +
      "102,一年2班,regular,陳大文,chen@cjps.kh.edu.tw\n" +
      "lib,圖書室,special,林美華,lin@cjps.kh.edu.tw\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '教室空間批次匯入範本.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadItemTemplate = () => {
    const csvContent = "\uFEFF" +
      "代碼,設備名稱,類別代碼,填報方式(checkbox_with_quantity/checkbox_only),排序,圖片路徑\n" +
      "desk_1,1. 塑膠抽屜_新式,desks_chairs,checkbox_with_quantity,1,/images/equipment/page_1_1_Image21.jpg\n" +
      "desk_2,2. 鐵製抽屜_新式,desks_chairs,checkbox_with_quantity,2,/images/equipment/page_1_2_Image22.jpg\n" +
      "locker_1,紅藍樣式,lockers,checkbox_with_quantity,11,/images/equipment/page_1_9_Image29.jpg\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '設備項目批次匯入範本.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvItemImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('代碼'));
      let successCount = 0;
      let errCount = 0;
      for (const line of lines) {
        const cols = line.split(',').map(c => c.trim());
        if (cols.length < 5) { errCount++; continue; }
        const [id, name, category, inputType, sortOrder, imageUrl] = cols;
        if (!id || !name) { errCount++; continue; }
        try {
          await setDoc(doc(db, 'eq_items', id), {
            id,
            name,
            category: category || 'desks_chairs',
            inputType: inputType || 'checkbox_with_quantity',
            sortOrder: parseInt(sortOrder) || 50,
            imageUrl: imageUrl || ''
          });
          successCount++;
        } catch (err) {
          errCount++;
        }
      }
      alert('設備項目匯入完成！成功 ' + successCount + ' 筆' + (errCount > 0 ? '，失敗 ' + errCount + ' 筆（格式錯誤）' : ''));
      loadData();
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setItemForm({ id: item.id, name: item.name, category: item.category, inputType: item.inputType, imageUrl: item.imageUrl || '', sortOrder: item.sortOrder });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name) return alert('請輸入名稱');
    try {
      const itemId = editingItem ? itemForm.id : 'item_' + Date.now();
      await setDoc(doc(db, 'eq_items', itemId), { id: itemId, name: itemForm.name, category: itemForm.category, inputType: itemForm.inputType, imageUrl: itemForm.imageUrl || '', sortOrder: parseInt(itemForm.sortOrder) || 50 });
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
      loadData();
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  const getClassroomStatus = (clsId) => {
    const clsInvs = inventories.filter(i => i.classroomId === clsId);
    if (clsInvs.length === 0) return { label: '未填報', color: '#64748b' };
    const latest = clsInvs.reduce((prev, cur) => new Date(prev.submittedAt) > new Date(cur.submittedAt) ? prev : cur);
    if (latest.status === 'completed') return { label: '交接完成', color: '#10b981', latest };
    if (latest.status === 'pending_handover') return { label: '待交接確認', color: '#f59e0b', latest };
    if (latest.status === 'rejected') return { label: '遭退回修正', color: '#ef4444', latest };
    return { label: '未知', color: '#64748b' };
  };

  const handleRemind = () => {
    alert('已成功模擬發送 Google Chat Webhook 與 Email 催報通知！\nWebhook 網址為：' + (systemSettings.googleChatWebhookUrl || '未設定'));
  };

  // --- Audit Matrix Logic ---
  const targetItems = equipmentItems.filter(i => {
    if (auditCategory !== 'all' && i.category !== auditCategory) return false;
    if (auditItem !== 'all' && i.id !== auditItem) return false;
    return true;
  });

  const targetClassrooms = classrooms.filter(c => {
    if (auditClassroomType !== 'all' && (c.category || 'regular') !== auditClassroomType) return false;
    return true;
  });

  const computedAuditRows = [];
  targetClassrooms.forEach(c => {
    const inv = inventories.find(i => i.id === c.id || i.classroomId === c.id);
    targetItems.forEach(item => {
      const itemData = inv?.items?.[item.id] || {};
      const isChecked = Boolean(itemData.checked);
      let qty = 0;
      if (item.inputType === 'checkbox_only') {
        qty = isChecked ? 1 : 0;
      } else {
        qty = Number(itemData.quantity) || (isChecked ? 1 : 0);
      }
      const status = itemData.status || 'normal';
      const notes = itemData.notes || inv?.notes || '';
      const updatedAt = inv?.updatedAt || '';
      const teacherName = inv?.reporterName || c.teacherName || '';
      const teacherEmail = inv?.reporterEmail || c.teacherEmail || '';
      const rowKey = `${c.id}__${item.id}`;

      // Zero quantity filter
      if (!showZeroQuantity && qty === 0 && !isChecked) {
        return;
      }
      // Status filter
      if (auditStatus === 'damaged' && status !== 'damaged') return;
      if (auditStatus === 'normal' && status === 'damaged') return;
      // Search filter
      if (auditSearch.trim()) {
        const kw = auditSearch.trim().toLowerCase();
        const match = [
          c.id,
          c.name,
          teacherName,
          item.name,
          notes
        ].some(val => (val || '').toLowerCase().includes(kw));
        if (!match) return;
      }

      computedAuditRows.push({
        rowKey,
        classroomId: c.id,
        classroomName: c.name,
        classroomCategory: c.category || 'regular',
        teacherName,
        teacherEmail,
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        quantity: qty,
        isChecked,
        status,
        notes,
        updatedAt
      });
    });
  });

  const totalClassroomCount = new Set(computedAuditRows.map(r => r.classroomId)).size;
  const totalQuantity = computedAuditRows.reduce((sum, r) => sum + r.quantity, 0);
  const totalDamagedCount = computedAuditRows.filter(r => r.status === 'damaged').length;

  const isAllAuditSelected = computedAuditRows.length > 0 && computedAuditRows.every(r => selectedAuditRows.includes(r.rowKey));

  const handleSelectAllAuditRows = () => {
    if (isAllAuditSelected) {
      setSelectedAuditRows([]);
    } else {
      setSelectedAuditRows(computedAuditRows.map(r => r.rowKey));
    }
  };

  const handleToggleAuditRow = (rowKey) => {
    if (selectedAuditRows.includes(rowKey)) {
      setSelectedAuditRows(selectedAuditRows.filter(k => k !== rowKey));
    } else {
      setSelectedAuditRows([...selectedAuditRows, rowKey]);
    }
  };

  const handleExportUpdateListCsv = () => {
    const rowsToExport = computedAuditRows.filter(r => selectedAuditRows.includes(r.rowKey));
    if (rowsToExport.length === 0) {
      alert('請先在左側勾選至少一筆欲處理或更新的設備紀錄！');
      return;
    }
    const headers = ['教室代碼', '教室名稱', '負責教師', '教師 Email', '設備類別', '設備名稱', '現有數量', '狀態', '報修與備註說明', '處理建議'];
    const csvRows = rowsToExport.map(r => [
      `"${r.classroomId}"`,
      `"${r.classroomName}"`,
      `"${r.teacherName}"`,
      `"${r.teacherEmail}"`,
      `"${categories[r.itemCategory] || r.itemCategory}"`,
      `"${r.itemName}"`,
      `"${r.quantity}"`,
      `"${r.status === 'damaged' ? '報修/損壞' : '正常'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"列入設備更新與處理名單"`
    ].join(','));
    const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `勾選設備更新與處理名單_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFullAuditCsv = () => {
    if (computedAuditRows.length === 0) {
      alert('目前篩選結果無資料可匯出');
      return;
    }
    const headers = ['教室代碼', '教室名稱', '負責教師', '教師 Email', '設備類別', '設備名稱', '現有數量', '狀態', '報修與備註說明', '更新時間'];
    const csvRows = computedAuditRows.map(r => [
      `"${r.classroomId}"`,
      `"${r.classroomName}"`,
      `"${r.teacherName}"`,
      `"${r.teacherEmail}"`,
      `"${categories[r.itemCategory] || r.itemCategory}"`,
      `"${r.itemName}"`,
      `"${r.quantity}"`,
      `"${r.status === 'damaged' ? '報修/損壞' : '正常'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${r.updatedAt}"`
    ].join(','));
    const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `全校設備盤點查詢統計表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (checkingAdmin) return <div style={{ textAlign: 'center', padding: '3rem' }}>驗證權限中...</div>;
  if (!isAdminVerified) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem 2rem', borderColor: 'red' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '1.5rem', color: '#ef4444' }}>存取遭拒</h2>
          <p style={{ color: '#64748b' }}>帳號 <strong>{user?.email}</strong> 尚未被授權。請聯絡管理員。</p>
        </div>
      </div>
    );
  }
  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>載入後台數據中...</div>;

  const completedCount = inventories.filter(i => i.status === 'completed').length;
  const pendingCount = inventories.filter(i => i.status === 'pending_handover').length;
  const rejectedCount = inventories.filter(i => i.status === 'rejected').length;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>管理後台看板</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('summary')}>數據總覽</button>
          <button className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('audit')}>🔍 設備盤點</button>
          <button className={`btn ${activeTab === 'classrooms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('classrooms')}>管理空間/班級 ({classrooms.length})</button>
          <button className={`btn ${activeTab === 'items' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('items')}>管理設備項目 ({equipmentItems.length})</button>
          <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('settings')}>系統與通知設定</button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleRemind}>發送全校催報通知 (Google Chat / Email)</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#10b981' }}><h3 style={{ fontSize: '2.5rem', color: '#10b981' }}>{completedCount}</h3><p>已完成清點/交接</p></div>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#f59e0b' }}><h3 style={{ fontSize: '2.5rem', color: '#f59e0b' }}>{pendingCount}</h3><p>待交接人確認</p></div>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#ef4444' }}><h3 style={{ fontSize: '2.5rem', color: '#ef4444' }}>{rejectedCount}</h3><p>遭退回修改</p></div>
          </div>
          <div className="card">
            <h3>近期填報紀錄明細</h3>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem' }}>班級</th><th style={{ padding: '0.75rem' }}>填報人</th>
                <th style={{ padding: '0.75rem' }}>日期</th><th style={{ padding: '0.75rem' }}>模式</th>
                <th style={{ padding: '0.75rem' }}>狀態</th><th style={{ padding: '0.75rem' }}>備註</th>
              </tr></thead>
              <tbody>
                {inventories.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}>{inv.classroomId}</td>
                    <td style={{ padding: '0.75rem' }}>{inv.reporterName}</td>
                    <td style={{ padding: '0.75rem' }}>{inv.reportDate}</td>
                    <td style={{ padding: '0.75rem' }}>{inv.hasHandover === false ? '獨立填報' : '雙人交接'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {inv.status === 'completed' && <span style={{ color: '#10b981', fontWeight: 'bold' }}>已完成</span>}
                      {inv.status === 'pending_handover' && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>待確認</span>}
                      {inv.status === 'rejected' && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>遭退回</span>}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#64748b' }}>{inv.remarks || '無'}</td>
                  </tr>
                ))}
                {inventories.length === 0 && <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>尚無填報紀錄</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'classrooms' && (
        <div className="grid-admin-1-2">
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3>{classroomForm.id ? '修改班級/空間' : '新增班級/空間'}</h3>
              <form onSubmit={handleSaveClassroom} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">空間名稱</label>
                  <input className="input-field" required disabled={!!classroomForm.id}
                    style={classroomForm.id ? { background: '#e2e8f0', cursor: 'not-allowed' } : {}}
                    value={classroomForm.name}
                    onChange={e => setClassroomForm({ ...classroomForm, name: e.target.value, id: classroomForm.id || e.target.value })}
                    placeholder="例如：一年3班" />
                </div>
                <div className="form-group">
                  <label className="form-label">空間類別</label>
                  <select className="input-field" value={classroomForm.category} onChange={e => setClassroomForm({ ...classroomForm, category: e.target.value })}>
                    <option value="regular">普通班級教室</option>
                    <option value="special">專科教室/辦公處室</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">負責教師姓名</label>
                  <input className="input-field" required value={classroomForm.teacherName} onChange={e => setClassroomForm({ ...classroomForm, teacherName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">負責教師 Email</label>
                  <input type="email" className="input-field" required value={classroomForm.teacherEmail} onChange={e => setClassroomForm({ ...classroomForm, teacherEmail: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>儲存</button>
                  {classroomForm.id && <button type="button" className="btn btn-secondary" onClick={() => setClassroomForm({ id: '', name: '', category: 'regular', teacherName: '', teacherEmail: '' })}>取消</button>}
                </div>
              </form>
            </div>
            <div className="card">
              <h3>📥 批次匯入與範本下載</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.6' }}>
                支援下載 CSV 範本，使用 Excel 編輯後另存為 CSV 匯入。欄位：<code style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>代碼,名稱,類別,教師,email</code>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, borderColor: '#3b82f6', color: '#3b82f6' }} onClick={handleDownloadClassroomTemplate}>
                  📄 下載匯入範本
                </button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => csvInputRef.current?.click()}>
                  📥 選擇檔案匯入
                </button>
              </div>
              <input ref={csvInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCsvImport} />
            </div>
          </div>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3>空間列表與交接進度</h3>
            <div className="table-responsive" style={{ maxHeight: '850px', flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.5rem' }}>空間名稱</th><th style={{ padding: '0.5rem' }}>負責教師</th>
                  <th style={{ padding: '0.5rem' }}>交接進度</th><th style={{ padding: '0.5rem' }}>操作</th>
                </tr></thead>
                <tbody>
                  {classrooms.map(cls => {
                    const status = getClassroomStatus(cls.id);
                    return (
                      <tr key={cls.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{cls.name}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{cls.teacherName}<br /><span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{cls.teacherEmail}</span></td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{ color: status.color, fontWeight: 'bold' }}>{status.label}</span>
                          {status.latest && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{status.latest.reportDate}</div>}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.3rem' }} onClick={() => setClassroomForm({ ...cls })}>修改</button>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'red' }} onClick={() => handleDeleteClassroom(cls.id)}>刪除</button>
                        </td>
                      </tr>
                    );
                  })}
                  {classrooms.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>尚無班級資料</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="fade-in">
          {/* Filter Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍 跨空間設備橫向盤點與篩選</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">設備類別</label>
                <select
                  className="input-field"
                  value={auditCategory}
                  onChange={e => {
                    setAuditCategory(e.target.value);
                    setAuditItem('all');
                  }}
                >
                  <option value="all">所有類別</option>
                  {Object.entries(categories).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">設備項目名稱</label>
                <select
                  className="input-field"
                  value={auditItem}
                  onChange={e => setAuditItem(e.target.value)}
                >
                  <option value="all">該類別全部項目 ({targetItems.length})</option>
                  {equipmentItems
                    .filter(i => auditCategory === 'all' || i.category === auditCategory)
                    .map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="form-label">空間分類</label>
                <select
                  className="input-field"
                  value={auditClassroomType}
                  onChange={e => setAuditClassroomType(e.target.value)}
                >
                  <option value="all">全部空間</option>
                  <option value="regular">普通導師班</option>
                  <option value="special">科任與行政處室</option>
                </select>
              </div>
              <div>
                <label className="form-label">設備狀態過濾</label>
                <select
                  className="input-field"
                  value={auditStatus}
                  onChange={e => setAuditStatus(e.target.value)}
                >
                  <option value="all">全部狀態</option>
                  <option value="damaged">🔴 僅有報修/損壞</option>
                  <option value="normal">🟢 僅正常</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <div style={{ flex: '1 1 280px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="搜尋空間代碼、名稱、老師或備註..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <input
                  type="checkbox"
                  checked={showZeroQuantity}
                  onChange={e => setShowZeroQuantity(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                顯示 0 數量教室 (未持有者)
              </label>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#3b82f6' }}>
              <h3 style={{ fontSize: '2.2rem', color: '#3b82f6' }}>{totalClassroomCount}</h3>
              <p style={{ color: '#64748b', fontWeight: 600 }}>持有空間數 (間)</p>
            </div>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#10b981' }}>
              <h3 style={{ fontSize: '2.2rem', color: '#10b981' }}>{totalQuantity}</h3>
              <p style={{ color: '#64748b', fontWeight: 600 }}>全校累計總數量</p>
            </div>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#ef4444' }}>
              <h3 style={{ fontSize: '2.2rem', color: '#ef4444' }}>{totalDamagedCount}</h3>
              <p style={{ color: '#64748b', fontWeight: 600 }}>報修與損壞件數</p>
            </div>
            <div className="card" style={{ marginBottom: 0, textAlign: 'center', borderColor: '#7c3aed', background: selectedAuditRows.length > 0 ? '#f5f3ff' : 'white' }}>
              <h3 style={{ fontSize: '2.2rem', color: '#7c3aed' }}>{selectedAuditRows.length}</h3>
              <p style={{ color: '#64748b', fontWeight: 600 }}>已勾選名單筆數</p>
            </div>
          </div>

          {/* Audit Table & Export Actions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0 }}>📋 設備分布明細表 (共 {computedAuditRows.length} 筆)</h3>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
                  onClick={handleExportUpdateListCsv}
                >
                  📤 匯出勾選的設備更新名單 (CSV) ({selectedAuditRows.length})
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportFullAuditCsv}
                >
                  📄 匯出當前篩選完整統計表 (CSV)
                </button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '850px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, borderBottom: '2px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 0.5rem', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllAuditSelected}
                        onChange={handleSelectAllAuditRows}
                        title="全選 / 取消全選"
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>空間代碼</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>空間名稱</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>負責教師</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>設備類別</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>設備名稱</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>清點數量</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>狀態</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>報修備註說明</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>最後清點時間</th>
                  </tr>
                </thead>
                <tbody>
                  {computedAuditRows.map(r => {
                    const isDamaged = r.status === 'damaged';
                    const isSelected = selectedAuditRows.includes(r.rowKey);
                    return (
                      <tr
                        key={r.rowKey}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: isDamaged ? '#fef2f2' : (isSelected ? '#f0fdf4' : 'transparent'),
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAuditRow(r.rowKey)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#475569' }}>{r.classroomId}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{r.classroomName}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                          <div><strong>{r.teacherName || '未填寫'}</strong></div>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{r.teacherEmail}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                          {categories[r.itemCategory] || r.itemCategory}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                          {r.itemName}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: r.quantity === 0 ? '#94a3b8' : '#2563eb' }}>
                          {r.quantity}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {isDamaged ? (
                            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: '#fee2e2', color: '#dc2626', fontWeight: 'bold', fontSize: '0.8rem' }}>
                              🔴 報修/損壞
                            </span>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: '#dcfce7', color: '#16a34a', fontWeight: 'bold', fontSize: '0.8rem' }}>
                              🟢 正常
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: isDamaged ? '#b91c1c' : '#475569', maxWidth: '250px' }}>
                          {r.notes || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                          {r.updatedAt || '尚未填報'}
                        </td>
                      </tr>
                    );
                  })}
                  {computedAuditRows.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                        <div style={{ fontWeight: 600 }}>目前沒有符合條件的設備盤點紀錄</div>
                        <div style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                          提示：若無結果，可嘗試勾選右上方「顯示 0 數量教室 (未持有者)」或變更篩選類別。
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleForceSeed} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
              ⚠️ 還原/重灌預設的 35 個設備與圖片項目
            </button>
          </div>
          <div className="grid-admin-1-2">
            <div>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>{editingItem ? '修改設備項目' : '新增設備項目'}</h3>
                <form onSubmit={handleSaveItem} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">設備名稱</label>
                    <input className="input-field" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="例如：課桌椅樣式 9" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">類別</label>
                    <select className="input-field" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })}>
                      {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">填報方式</label>
                    <select className="input-field" value={itemForm.inputType} onChange={e => setItemForm({ ...itemForm, inputType: e.target.value })}>
                      <option value="checkbox_only">僅勾選 (有無)</option>
                      <option value="checkbox_with_quantity">勾選 + 填寫數量</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>示意圖片與圖庫</label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowImagePickerModal(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem', borderColor: '#3b82f6', color: '#3b82f6', fontWeight: 600 }}
                        >
                          🖼️ 瀏覽內建圖庫 (35款)
                        </button>
                        <button
                          type="button"
                          onClick={() => customImgInputRef.current?.click()}
                          className="btn btn-primary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem', background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
                        >
                          📤 上傳電腦相片
                        </button>
                      </div>
                    </div>
                    <input
                      ref={customImgInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleUploadCustomImage}
                    />
                    <input
                      className="input-field"
                      value={itemForm.imageUrl}
                      onChange={e => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                      placeholder="點上方按鈕選取圖庫或電腦相片..."
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      💡 點「🖼️ 瀏覽內建圖庫」直接挑選現有照片；或點「📤 上傳電腦相片」直接從本機選擇照片，儲存後立刻於全校線上發布生效！
                    </div>
                    {itemForm.imageUrl && (
                      <div style={{ marginTop: '0.6rem', padding: '0.5rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <img src={itemForm.imageUrl} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain', background: 'white', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>當前預覽示意圖</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>{itemForm.imageUrl.length > 50 ? itemForm.imageUrl.substring(0, 50) + '... (自動壓縮相片)' : itemForm.imageUrl}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">排序權重</label>
                    <input type="number" className="input-field" value={itemForm.sortOrder} onChange={e => setItemForm({ ...itemForm, sortOrder: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>儲存</button>
                    {editingItem && <button type="button" className="btn btn-secondary" onClick={() => { setEditingItem(null); setItemForm({ id: '', name: '', category: 'desks_chairs', inputType: 'checkbox_only', imageUrl: '', sortOrder: 50 }); }}>取消</button>}
                  </div>
                </form>
              </div>
              <div className="card">
                <h3>管理設備類別</h3>
                <div style={{ marginTop: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {Object.entries(categories).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.85rem' }}><code style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '4px' }}>{k}</code>{v}</span>
                      <button className="btn btn-secondary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', color: 'red' }} onClick={() => handleDeleteCategory(k)}>刪除</button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input className="input-field" placeholder="類別代碼（英文，如 sports）" value={newCatKey} onChange={e => setNewCatKey(e.target.value)} />
                  <input className="input-field" placeholder="顯示名稱（如 體育器材）" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} />
                  <button className="btn btn-primary" onClick={handleAddCategory}>+ 新增類別</button>
                </div>
              </div>
              <div className="card">
                <h3>📥 批次匯入設備與範本下載</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.6' }}>
                  支援下載 CSV 範本，使用 Excel 編輯後匯入建檔。欄位：<code style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>代碼,名稱,類別,填報方式,排序,圖片</code>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, borderColor: '#3b82f6', color: '#3b82f6' }} onClick={handleDownloadItemTemplate}>
                    📄 下載設備範本
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => itemCsvInputRef.current?.click()}>
                    📥 選擇檔案匯入
                  </button>
                </div>
                <input ref={itemCsvInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCsvItemImport} />
              </div>
            </div>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3>設備項目列表</h3>
              <div className="table-responsive" style={{ maxHeight: '1350px', flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.5rem' }}>排序</th><th style={{ padding: '0.5rem' }}>圖片</th>
                    <th style={{ padding: '0.5rem' }}>設備名稱</th><th style={{ padding: '0.5rem' }}>類別</th>
                    <th style={{ padding: '0.5rem' }}>方式</th><th style={{ padding: '0.5rem' }}>操作</th>
                  </tr></thead>
                  <tbody>
                    {equipmentItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem' }}>{item.sortOrder}</td>
                        <td style={{ padding: '0.5rem' }}>
                          {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', background: '#f1f5f9' }} /> : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>無</span>}
                        </td>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{item.name}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>{categories[item.category] || item.category}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>{item.inputType === 'checkbox_with_quantity' ? '勾選+數量' : '僅勾選'}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.3rem' }} onClick={() => handleEditClick(item)}>修改</button>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'red' }} onClick={() => handleDeleteItem(item.id)}>刪除</button>
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
        <div className="grid-admin-1-1">
          <div className="card" style={{ height: 'fit-content' }}>
            <h3>系統與通知設定</h3>
            <form onSubmit={handleSaveSettings} style={{ marginTop: '1.5rem' }}>
              <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={settingsForm.requireSignature} onChange={e => setSettingsForm({ ...settingsForm, requireSignature: e.target.checked })} style={{ width: '1.25rem', height: '1.25rem' }} />
                  強制要求電子簽名（填報人/交接人均必須手寫簽署）
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">系統發信信箱 (Sender Email)</label>
                <input type="email" className="input-field" value={settingsForm.senderEmail} onChange={e => setSettingsForm({ ...settingsForm, senderEmail: e.target.value })} placeholder="noreply@school.edu.tw" />
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>用於通知 Email 的寄件人信箱（搭配 GAS 橋接發信）。</p>
              </div>
              <div className="form-group">
                <label className="form-label">Google Chat Webhook 網址</label>
                <input type="url" className="input-field" value={settingsForm.googleChatWebhookUrl} onChange={e => setSettingsForm({ ...settingsForm, googleChatWebhookUrl: e.target.value })} placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..." />
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>用於發送催報卡片至 Google Chat 空間。</p>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 3rem' }}>儲存設定</button>
              </div>
            </form>
          </div>
          <div className="card" style={{ height: 'fit-content' }}>
            <h3>管理員帳號白名單</h3>
            <div style={{ marginTop: '1rem' }}>
              {admins.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.9rem' }}>{a.id === user?.email ? '👑 ' : ''}{a.email || a.id}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: a.id === user?.email ? '#94a3b8' : 'red', cursor: a.id === user?.email ? 'not-allowed' : 'pointer' }}
                    onClick={() => handleRemoveAdmin(a.id)} disabled={a.id === user?.email}>移除</button>
                </div>
              ))}
              {admins.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>尚無管理員資料</p>}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input className="input-field" type="email" placeholder="輸入要新增的 Email" value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAdmin()} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={handleAddAdmin}>新增</button>
            </div>
          </div>
        </div>
      )}

      {showImagePickerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>🖼️ 設備示意圖庫預覽與選擇器</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  點擊下方任一圖片即可快速選擇。也可點選右方按鈕直接從本機電腦上傳新照片。
                </p>
              </div>
              <button
                onClick={() => setShowImagePickerModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                📂 共收錄 {PRESET_EQUIPMENT_IMAGES.length} 款系統預設課桌椅與設備相片
              </span>
              <button
                type="button"
                onClick={() => customImgInputRef.current?.click()}
                className="btn btn-primary"
                style={{ background: '#10b981', borderColor: '#10b981', fontSize: '0.85rem' }}
              >
                📤 從電腦選擇/上傳新照片 (免發布即時生效)
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
              {PRESET_EQUIPMENT_IMAGES.map((img, idx) => {
                const isSelected = itemForm.imageUrl === img.url;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setItemForm(prev => ({ ...prev, imageUrl: img.url }));
                      setShowImagePickerModal(false);
                    }}
                    style={{
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : 'white',
                      borderRadius: '8px', padding: '0.6rem', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      transition: 'all 0.15s ease', textAlign: 'center',
                      boxShadow: isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)' : 'none'
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      style={{ width: '70px', height: '70px', objectFit: 'contain', background: '#f1f5f9', borderRadius: '4px', marginBottom: '0.5rem' }}
                    />
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.name}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setShowImagePickerModal(false)}
                className="btn btn-secondary"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
