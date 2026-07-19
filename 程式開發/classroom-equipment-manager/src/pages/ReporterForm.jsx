import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../context/AuthContext';
import { seedEquipmentItems, seedClassrooms, seedSettings } from '../seedData';

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
      try {
        setLoadingData(true);
        
        await seedSettings();

        // 1. Fetch classrooms
        const clsSnap = await getDocs(collection(db, 'eq_classrooms'));
        let cls = clsSnap.docs.map(d => ({id: d.id, ...d.data()}));
        if (cls.length === 0) {
          await seedClassrooms();
          const clsSnap2 = await getDocs(collection(db, 'eq_classrooms'));
          cls = clsSnap2.docs.map(d => ({id: d.id, ...d.data()}));
        }
        setClassrooms(cls);
        
        // 2. Fetch items
        const itemSnap = await getDocs(collection(db, 'eq_items'));
        let items = itemSnap.docs.map(d => ({id: d.id, ...d.data()}));
        if (items.length === 0) {
          await seedEquipmentItems();
          const itemSnap2 = await getDocs(collection(db, 'eq_items'));
          items = itemSnap2.docs.map(d => ({id: d.id, ...d.data()}));
        }
        setEquipmentItems(items.sort((a,b) => (a.sortOrder || 50) - (b.sortOrder || 50)));

        // 3. Fetch settings
        const settingsSnap = await getDoc(doc(db, 'eq_settings', 'global'));
        if (settingsSnap.exists()) {
          setSystemSettings(settingsSnap.data());
        }
      } catch (err) {
        console.error("Error loading form data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    if (user) {
      loadData();
    }
  }, [user]);
  
  const handleItemToggle = (itemId) => {
    setInventory(prev => {
      const isSelected = prev[itemId]?.checked;
      if (isSelected) {
        const newInv = {...prev};
        delete newInv[itemId];
        return newInv;
      } else {
        return { ...prev, [itemId]: { checked: true, count: 1 } };
      }
    });
  };

  const handleItemCount = (itemId, count) => {
    setInventory(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], count: parseInt(count) || 0 }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.classroomId) return alert('請選擇班級');
    
    let signatureUrl = '';
    // Only check signature if required in settings
    if (!formData.hasHandover && systemSettings.requireSignature) {
      if (!sigPad || sigPad.isEmpty()) return alert('請在簽名區簽名以示負責');
      signatureUrl = sigPad.getTrimmedCanvas().toDataURL('image/png');
    }

    try {
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
      alert('填報成功！');
      window.location.reload();
    } catch (err) {
      alert('發生錯誤: ' + err.message);
    }
  };

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

  if (loadingData) {
    return <div style={{textAlign: 'center', padding: '3rem'}}>載入填報清單中...</div>;
  }

  return (
    <div className="card fade-in">
      <h2 style={{marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem'}}>
        教室設備清點填報
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">選擇班級/空間</label>
          <select 
            className="input-field" 
            value={formData.classroomId}
            onChange={e => setFormData({...formData, classroomId: e.target.value})}
            required
          >
            <option value="">-- 請選擇 --</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="responsive-form-row">
          <div className="form-group" style={{flex: 1}}>
            <label className="form-label">填報人姓名</label>
            <input className="input-field" required value={formData.reporterName} onChange={e => setFormData({...formData, reporterName: e.target.value})} />
          </div>
          <div className="form-group" style={{flex: 1}}>
            <label className="form-label">填報人 Email (唯讀)</label>
            <input type="email" className="input-field" readOnly style={{background: '#e2e8f0', cursor: 'not-allowed'}} value={formData.reporterEmail} />
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
                <label className="form-label">交接人姓名</label>
                <input className="input-field" required value={formData.handoverName} onChange={e => setFormData({...formData, handoverName: e.target.value})} />
              </div>
              <div style={{flex: 1}}>
                <label className="form-label">交接人 Email (重要，用於寄發審查連結)</label>
                <input type="email" className="input-field" required value={formData.handoverEmail} onChange={e => setFormData({...formData, handoverEmail: e.target.value})} />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Equipment Sections */}
        {Object.entries(categories).map(([catKey, catName]) => {
          const itemsInCat = equipmentItems.filter(i => i.category === catKey);
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
                canvasProps={{className: 'sigCanvas'}}
              />
            </div>
            <button type="button" className="btn btn-secondary" style={{marginTop: '0.5rem', fontSize: '0.8rem'}} onClick={() => sigPad.clear()}>重新簽名</button>
          </div>
        )}

        <div style={{marginTop: '2rem', textAlign: 'center'}}>
          <button type="submit" className="btn btn-primary" style={{padding: '1rem 3rem', fontSize: '1.2rem'}}>
            {formData.hasHandover ? '送出並發送交接確認信' : '確認無誤並完成送出'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReporterForm;
