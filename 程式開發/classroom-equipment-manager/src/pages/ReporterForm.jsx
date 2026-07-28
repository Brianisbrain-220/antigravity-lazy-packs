import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../context/AuthContext';
import { seedEquipmentItems, seedClassrooms, seedSettings, DEFAULT_CATEGORIES, DEFAULT_CLASSROOMS, DEFAULT_EQUIPMENT_ITEMS } from '../seedData';

const getSortWeight = (item) => {
  if (item?.sortOrder === undefined || item?.sortOrder === null || item?.sortOrder === '') return 50;
  const num = Number(item.sortOrder);
  return !isNaN(num) ? num : 50;
};

function ReporterForm() {
  const { user } = useAuth();
  
  const [classrooms, setClassrooms] = useState([]);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ requireSignature: true });
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    classroomId: '',
    reporterName: '',
    reporterEmail: '',
    hasHandover: true,
    handoverName: '',
    handoverEmail: '',
    remarks: ''
  });
  
  const [inventory, setInventory] = useState({});
  const [sigPad, setSigPad] = useState(null);
  const [savedSignature, setSavedSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [showRoomListModal, setShowRoomListModal] = useState(false);
  
  // Autocomplete user info
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        reporterEmail: user.email || '',
        reporterName: user.displayName || prev.reporterName || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);

      // 1. Fetch classrooms independently
      try {
        const clsSnap = await getDocs(collection(db, 'eq_classrooms'));
        let cls = clsSnap.docs.map(d => ({id: d.id, ...d.data()}));
        if (cls.length === 0) {
          try {
            await seedClassrooms();
            const clsSnap2 = await getDocs(collection(db, 'eq_classrooms'));
            cls = clsSnap2.docs.map(d => ({id: d.id, ...d.data()}));
          } catch (seedErr) {
            console.warn("Classrooms seeding skipped:", seedErr.message);
          }
        }
        if (cls.length === 0) {
          cls = DEFAULT_CLASSROOMS;
        }
        setClassrooms(cls);
      } catch (err) {
        console.warn("Using default classrooms due to fetch error:", err.message);
        setClassrooms(DEFAULT_CLASSROOMS);
      }

      // 2. Fetch items independently
      try {
        const itemSnap = await getDocs(collection(db, 'eq_items'));
        let items = itemSnap.docs.map(d => ({id: d.id, ...d.data()}));
        if (items.length === 0) {
          try {
            await seedEquipmentItems();
            const itemSnap2 = await getDocs(collection(db, 'eq_items'));
            items = itemSnap2.docs.map(d => ({id: d.id, ...d.data()}));
          } catch (seedErr) {
            console.warn("Equipment items seeding skipped:", seedErr.message);
          }
        }
        if (items.length === 0) {
          items = DEFAULT_EQUIPMENT_ITEMS;
        }
        const sortedItems = items.sort((a, b) => {
          const wA = getSortWeight(a);
          const wB = getSortWeight(b);
          if (wA !== wB) return wA - wB;
          return (a.id || '').localeCompare(b.id || '');
        });
        setEquipmentItems(sortedItems);
      } catch (err) {
        console.warn("Using default equipment items due to fetch error:", err.message);
        const sortedItems = [...DEFAULT_EQUIPMENT_ITEMS].sort((a, b) => {
          const wA = getSortWeight(a);
          const wB = getSortWeight(b);
          if (wA !== wB) return wA - wB;
          return (a.id || '').localeCompare(b.id || '');
        });
        setEquipmentItems(sortedItems);
      }

      // 3. Fetch settings independently
      try {
        const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
        if (settingsSnap.exists()) {
          setSystemSettings(settingsSnap.data());
        }
      } catch (err) {
        console.warn("Using default system settings due to fetch error:", err.message);
      }

      setLoadingData(false);
    };
    loadData();
  }, []);
  
  const handleItemToggle = (itemId) => {
    setInventory(prev => {
      const isSelected = prev[itemId]?.checked;
      if (isSelected) {
        const newInv = {...prev};
        delete newInv[itemId];
        return newInv;
      } else {
        return { ...prev, [itemId]: { checked: true, count: 1, quantity: 1 } };
      }
    });
  };

    const handleItemCount = (itemId, count) => {
    const num = parseInt(count, 10) || 0;
    setInventory(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], count: num, quantity: num }
    }));
  };

  const { matchedClassroom, roomMatchError, suggestedClassrooms } = useMemo(() => {
    if (!roomInput || !roomInput.trim()) {
      return { matchedClassroom: null, roomMatchError: '', suggestedClassrooms: [] };
    }
    const val = roomInput.trim().toLowerCase();
    
    // 1. Exact match (id, name, or room_ID)
    let exact = classrooms.find(c => 
      (c.id || '').toLowerCase() === val || 
      (c.name || '').toLowerCase() === val ||
      (c.id || '').toLowerCase() === `room_${val}`
    );
    
    if (exact) {
      return { matchedClassroom: exact, roomMatchError: '', suggestedClassrooms: [] };
    }
    
    // 2. Partial search matches
    const matches = classrooms.filter(c => 
      (c.id || '').toLowerCase().includes(val) || 
      (c.name || '').toLowerCase().includes(val)
    );
    
    if (matches.length === 1) {
      return { matchedClassroom: matches[0], roomMatchError: '', suggestedClassrooms: [] };
    } else if (matches.length > 1) {
      return { 
        matchedClassroom: null, 
        roomMatchError: `找到 ${matches.length} 間相關空間，請直接點選下方建議或輸入更完整編號`, 
        suggestedClassrooms: matches.slice(0, 8) 
      };
    } else {
      return { 
        matchedClassroom: null, 
        roomMatchError: `❌ 後台資料庫無此編號或空間「${roomInput}」，請確認是否已經在後台建立`, 
        suggestedClassrooms: [] 
      };
    }
  }, [roomInput, classrooms]);

  useEffect(() => {
    if (matchedClassroom) {
      setFormData(prev => ({ ...prev, classroomId: matchedClassroom.id }));
    } else {
      setFormData(prev => ({ ...prev, classroomId: '' }));
    }
  }, [matchedClassroom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // 1. Validate Classroom
    if (!formData.classroomId || !matchedClassroom) {
      const msg = roomInput.trim()
        ? `⚠️ 後台資料庫查無「${roomInput}」這個教室編號或名稱，請輸入或點選有效空間！`
        : '⚠️ 請先在上方「教室編號或名稱」欄位輸入並成功對照後再送出表單';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert(msg);
      return;
    }

    // 2. Validate Reporter Name & Email
    if (!formData.reporterName || !formData.reporterName.trim()) {
      const msg = '⚠️ 請填寫「填報人姓名」！';
      setErrorMessage(msg);
      window.scrollTo({ top: 200, behavior: 'smooth' });
      alert(msg);
      return;
    }
    if (!formData.reporterEmail || !formData.reporterEmail.trim()) {
      const msg = '⚠️ 請填寫「填報人 Email」！';
      setErrorMessage(msg);
      window.scrollTo({ top: 250, behavior: 'smooth' });
      alert(msg);
      return;
    }

    // 3. Validate Handover info if hasHandover is selected
    if (formData.hasHandover) {
      if (!formData.handoverName || !formData.handoverName.trim()) {
        const msg = '⚠️ 您選擇了「需交接」，請務必填寫「交接人姓名」！';
        setErrorMessage(msg);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        alert(msg);
        return;
      }
      if (!formData.handoverEmail || !formData.handoverEmail.trim()) {
        const msg = '⚠️ 您選擇了「需交接」，請務必填寫「交接人 Email」以便接收審查連結！';
        setErrorMessage(msg);
        window.scrollTo({ top: 350, behavior: 'smooth' });
        alert(msg);
        return;
      }
    }

    // 4. Validate Signature
    let signatureUrl = '';
    // Only check signature if required in settings
    if (!formData.hasHandover && systemSettings.requireSignature) {
      signatureUrl = savedSignature || (sigPad && !sigPad.isEmpty() ? sigPad.getTrimmedCanvas().toDataURL('image/png') : '');
      if (!signatureUrl) {
        const msg = '⚠️ 請在下方「填報人簽名」欄位完成簽名以示負責';
        setErrorMessage(msg);
        alert(msg);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const docData = {
        ...formData,
        status: formData.hasHandover ? 'pending_handover' : 'completed',
        reportDate: new Date().toISOString().split('T')[0],
        items: inventory,
        submittedAt: new Date().toISOString()
      };
      
      if (!formData.hasHandover) {
        docData.reporterSignatureUrl = signatureUrl;
      } else {
        docData.handover = {
          name: formData.handoverName,
          email: formData.handoverEmail,
          token: Math.random().toString(36).substring(2) + Date.now().toString(36),
          signedAt: null,
          signatureUrl: '',
          rejectReason: ''
        };
      }
      
      await addDoc(collection(db, 'eq_inventories'), docData);
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setIsSubmitting(false);
      const errMsg = '資料傳送時發生錯誤: ' + err.message;
      setErrorMessage(errMsg);
      alert(errMsg);
    }
  };

  const sortedCategoryEntries = useMemo(() => {
    const baseCats = systemSettings.categories || DEFAULT_CATEGORIES;
    const allCats = { ...baseCats };
    equipmentItems.forEach(item => {
      const cat = item.category || 'other';
      if (!allCats[cat]) {
        allCats[cat] = cat === 'other' ? '其他設備' : cat;
      }
    });

    const catMinOrder = {};
    Object.keys(allCats).forEach(catKey => {
      const itemsInCat = equipmentItems.filter(i => (i.category || 'other') === catKey);
      if (itemsInCat.length > 0) {
        const minOrder = Math.min(...itemsInCat.map(i => getSortWeight(i)));
        catMinOrder[catKey] = minOrder;
      } else {
        catMinOrder[catKey] = 9999;
      }
    });

    return Object.entries(allCats).sort(([keyA], [keyB]) => {
      const orderA = catMinOrder[keyA] ?? 9999;
      const orderB = catMinOrder[keyB] ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });
  }, [systemSettings, equipmentItems]);

  if (loadingData) {
    return <div style={{textAlign: 'center', padding: '3rem'}}>載入填報清單中...</div>;
  }

  if (isSubmittedSuccess) {
    return (
      <div className="container" style={{maxWidth: 600, margin: '3rem auto', padding: '1rem'}}>
        <div className="card fade-in" style={{padding: '3rem 2rem', borderTop: '6px solid #10b981', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '4.5rem', marginBottom: '1rem'}}>🎉</div>
          <h2 style={{color: '#059669', marginBottom: '0.5rem', fontSize: '1.8rem', fontWeight: 700}}>填報成功！資料已送出</h2>
          <div style={{display: 'inline-block', background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 'bold', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
            ✔ 雲端資料庫已同步覆核：已完成報表寫入
          </div>
          <p style={{color: '#4b5563', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: 1.6}}>
            感謝老師的耐心協助！您所填報的教室設備清點與報修資料，已經成功送出並記錄於總務處設備管理系統中。
          </p>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '50px'}}
            onClick={() => window.location.reload()}
          >
            ➕ 繼續填報其他教室 / 返回表單
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card fade-in">
      <h2 style={{marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem'}}>
        教室設備清點填報
      </h2>
      
      {/* Sticky Floating Status Toast for Mobile/LINE WebView */}
      {errorMessage && (
        <div className="fade-in" style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '520px',
          background: '#ef4444',
          color: 'white',
          padding: '0.8rem 1.2rem',
          borderRadius: '50px',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
          zIndex: 99999,
          fontWeight: 'bold',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{errorMessage}</span>
          <button 
            type="button" 
            onClick={() => setErrorMessage('')}
            style={{background: 'none', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '1.3rem', cursor: 'pointer', marginLeft: '0.5rem'}}
          >
            ✕
          </button>
        </div>
      )}

      {isSubmitting && (
        <div className="fade-in" style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '520px',
          background: '#0284c7',
          color: 'white',
          padding: '0.8rem 1.2rem',
          borderRadius: '50px',
          boxShadow: '0 10px 25px rgba(2, 132, 199, 0.4)',
          zIndex: 99999,
          fontWeight: 'bold',
          fontSize: '0.95rem',
          textAlign: 'center'
        }}>
          ⏳ 系統正在將資料上傳至雲端，請稍候片刻...
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group fade-in">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem'}}>
            <label className="form-label" style={{marginBottom: 0}}>
              輸入教室編號 / 空間名稱 <span style={{color: '#dc2626'}}>*</span>
            </label>
            <button 
              type="button" 
              onClick={() => setShowRoomListModal(!showRoomListModal)}
              style={{
                background: 'none', 
                border: 'none', 
                color: 'var(--primary)', 
                textDecoration: 'underline', 
                fontSize: '0.85rem', 
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {showRoomListModal ? '▲ 收起空間對照表' : '🔍 忘記編號？點此展開全校空間查詢表'}
            </button>
          </div>

          <input 
            type="text"
            className="input-field" 
            placeholder="請輸入教室編號或名稱 (例如: 101, room_101, 一年1班, 電腦教室)..."
            value={roomInput}
            onChange={e => setRoomInput(e.target.value)}
            style={{
              borderColor: matchedClassroom ? '#10b981' : (roomMatchError ? '#ef4444' : 'var(--border-color)'),
              borderWidth: (matchedClassroom || roomMatchError) ? '2px' : '1px',
              padding: '0.8rem',
              fontSize: '1.05rem',
              background: matchedClassroom ? '#f0fdf4' : 'white'
            }}
          />

          {/* matching status feedback */}
          {matchedClassroom && (
            <div className="fade-in" style={{
              marginTop: '0.5rem', 
              padding: '0.65rem 1rem', 
              background: '#ecfdf5', 
              border: '1px solid #10b981', 
              borderRadius: '8px', 
              color: '#047857', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span>✅ 成功對照後台空間：【{matchedClassroom.name}】(編號: {matchedClassroom.id})</span>
              <span style={{fontSize: '0.75rem', background: '#10b981', color: 'white', padding: '0.15rem 0.6rem', borderRadius: '20px'}}>有效空間</span>
            </div>
          )}

          {roomMatchError && !matchedClassroom && (
            <div className="fade-in" style={{
              marginTop: '0.5rem', 
              padding: '0.65rem 1rem', 
              background: '#fef2f2', 
              border: '1px solid #ef4444', 
              borderRadius: '8px', 
              color: '#b91c1c', 
              fontWeight: 'bold'
            }}>
              {roomMatchError}
            </div>
          )}

          {/* Suggested classroom pill buttons when multiple matches found */}
          {suggestedClassrooms.length > 0 && !matchedClassroom && (
            <div className="fade-in" style={{marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center'}}>
              <span style={{fontSize: '0.85rem', color: '#4b5563', fontWeight: 600}}>快速點選符合的空間：</span>
              {suggestedClassrooms.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setRoomInput(c.name)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    background: '#e0f2fe',
                    border: '1px solid #0284c7',
                    color: '#0369a1',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  {c.name} (#{c.id})
                </button>
              ))}
            </div>
          )}

          {/* Collapsible reference list of all classrooms */}
          {showRoomListModal && (
            <div className="fade-in" style={{
              marginTop: '0.8rem', 
              padding: '1rem', 
              background: '#f8fafc', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              maxHeight: '220px', 
              overflowY: 'auto'
            }}>
              <div style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.6rem'}}>
                📌 全校教室與空間後台對照表 (直接點擊即可套用)：
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem'}}>
                {classrooms.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setRoomInput(c.name); setShowRoomListModal(false); }}
                    style={{
                      padding: '0.5rem 0.7rem',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <span style={{fontWeight: 600, color: '#0f172a'}}>{c.name}</span>
                    <span style={{color: '#64748b', fontSize: '0.75rem'}}>#{c.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="responsive-form-row">
          <div className="form-group" style={{flex: 1}}>
            <label className="form-label">填報人姓名 <span style={{color: '#dc2626'}}>*</span></label>
            <input className="input-field" value={formData.reporterName} onChange={e => setFormData({...formData, reporterName: e.target.value})} placeholder="請輸入姓名" />
          </div>
          <div className="form-group" style={{flex: 1}}>
            <label className="form-label">填報人 Email <span style={{color: '#dc2626'}}>*</span></label>
            <input type="email" className="input-field" value={formData.reporterEmail} onChange={e => setFormData({...formData, reporterEmail: e.target.value})} placeholder="請輸入學校 Email 或常用電子郵件" />
          </div>
        </div>

        <div className="form-group" style={{background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
          <label className="form-label">交接模式選擇</label>
          <div style={{display: 'flex', gap: '2rem'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
              <input type="radio" name="handover" checked={formData.hasHandover} onChange={() => setFormData({...formData, hasHandover: true})} />
              需交接 (傳送確認信給下一任)
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
              <input type="radio" name="handover" checked={!formData.hasHandover} onChange={() => setFormData({...formData, hasHandover: false})} />
              不需交接 (單人直接填報完成)
            </label>
          </div>
          
          {formData.hasHandover && (
            <div className="responsive-form-row fade-in" style={{marginTop: '1rem'}}>
              <div style={{flex: 1}}>
                <label className="form-label">交接人姓名 <span style={{color: '#dc2626'}}>*</span></label>
                <input className="input-field" value={formData.handoverName} onChange={e => setFormData({...formData, handoverName: e.target.value})} placeholder="請輸入交接老師姓名" />
              </div>
              <div style={{flex: 1}}>
                <label className="form-label">交接人 Email (重要，用於寄發審查連結) <span style={{color: '#dc2626'}}>*</span></label>
                <input type="email" className="input-field" value={formData.handoverEmail} onChange={e => setFormData({...formData, handoverEmail: e.target.value})} placeholder="請輸入交接老師 Email" />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Equipment Sections */}
        {sortedCategoryEntries.map(([catKey, catName]) => {
          const itemsInCat = equipmentItems.filter(i => (i.category || 'other') === catKey);
          if (itemsInCat.length === 0) return null;
          
          return (
            <div key={catKey} style={{marginTop: '2rem'}}>
              <h3 style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>{catName}</h3>
              <div className="equipment-grid">
                {itemsInCat.map(item => {
                  const isSelected = !!inventory[item.id];
                  return (
                    <div 
                      key={item.id} 
                      className={`equipment-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="equipment-img-container" onClick={() => handleItemToggle(item.id)}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="equipment-img" />
                        ) : (
                          <span style={{color: '#94a3b8'}}>無圖片</span>
                        )}
                      </div>
                      <div className="equipment-info">
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <div className="custom-checkbox" onClick={() => handleItemToggle(item.id)}>
                            {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <span className="equipment-name">{item.name}</span>
                        </div>
                      </div>
                      
                      {isSelected && item.inputType === 'checkbox_with_quantity' && (
                        <div style={{padding: '0 1rem 1rem 1rem'}} className="fade-in">
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{padding: '0.4rem'}} 
                            placeholder="數量" 
                            min="1"
                            value={inventory[item.id].count || ''}
                            onChange={(e) => handleItemCount(item.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="form-group" style={{marginTop: '2rem'}}>
          <label className="form-label">備註 (損壞報修、其他說明)</label>
          <textarea 
            className="input-field" 
            rows="4" 
            value={formData.remarks}
            onChange={e => setFormData({...formData, remarks: e.target.value})}
          ></textarea>
        </div>

        {!formData.hasHandover && systemSettings.requireSignature && (
          <div className="form-group fade-in">
            <label className="form-label">填報人簽名 (不需交接者請直接簽名以示負責)</label>
            <div className="signature-container">
              <SignatureCanvas 
                ref={(ref) => { setSigPad(ref) }}
                penColor="blue"
                clearOnResize={false}
                onEnd={() => {
                  if (sigPad && !sigPad.isEmpty()) {
                    setSavedSignature(sigPad.getTrimmedCanvas().toDataURL('image/png'));
                  }
                }}
                canvasProps={{
                  className: 'sigCanvas',
                  style: { width: '100%', height: '200px', touchAction: 'none' }
                }}
              />
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem'}}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{fontSize: '0.8rem'}} 
                onClick={() => {
                  if (sigPad) sigPad.clear();
                  setSavedSignature('');
                }}
              >
                重新簽名
              </button>
              {savedSignature ? (
                <span style={{fontSize: '0.85rem', color: '#059669', fontWeight: 'bold'}}>✅ 已自動記錄簽名！(滑動檢查頁面也不會遺失)</span>
              ) : (
                <span style={{fontSize: '0.8rem', color: '#059669', fontWeight: 'bold'}}>🔒 簽名已防護：往下滑動畫面不會被清除</span>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="fade-in" style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '1.5rem',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            {errorMessage}
          </div>
        )}

        <div style={{marginTop: '2rem', textAlign: 'center'}}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmitting}
            style={{
              padding: '1.1rem 2.5rem', 
              fontSize: '1.2rem',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '50px',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
              fontWeight: 700,
              transition: 'all 0.2s'
            }}
          >
            {isSubmitting ? '⏳ 資料上傳雲端中，請稍候...' : (formData.hasHandover ? '確認無誤並發送交接信 ➔' : '確認無誤並完成送出 ➔')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReporterForm;
