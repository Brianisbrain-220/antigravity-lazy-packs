import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const seedEquipmentItems = async (force = false) => {
  const items = [
    // 課桌椅 1~8
    { id: 'desk_1', category: 'desks_chairs', name: '1. 塑膠抽屜_新式', imageUrl: '/src/assets/images/equipment/page_1_1_Image21.jpg', inputType: 'checkbox_only', sortOrder: 1 },
    { id: 'desk_2', category: 'desks_chairs', name: '2. 鐵製抽屜_新式', imageUrl: '/src/assets/images/equipment/page_1_2_Image22.jpg', inputType: 'checkbox_only', sortOrder: 2 },
    { id: 'desk_3', category: 'desks_chairs', name: '3. 木頭桌椅', imageUrl: '/src/assets/images/equipment/page_1_3_Image23.jpg', inputType: 'checkbox_only', sortOrder: 3 },
    { id: 'desk_4', category: 'desks_chairs', name: '4. 局補助_可調式', imageUrl: '/src/assets/images/equipment/page_1_4_Image24.jpg', inputType: 'checkbox_only', sortOrder: 4 },
    { id: 'desk_5', category: 'desks_chairs', name: '5. 舊款_可調式', imageUrl: '/src/assets/images/equipment/page_1_5_Image25.jpg', inputType: 'checkbox_only', sortOrder: 5 },
    { id: 'desk_6', category: 'desks_chairs', name: '6. 桌椅樣式 6', imageUrl: '/src/assets/images/equipment/page_1_6_Image26.jpg', inputType: 'checkbox_only', sortOrder: 6 },
    { id: 'desk_7', category: 'desks_chairs', name: '7. 圓凳樣式 7', imageUrl: '/src/assets/images/equipment/page_1_7_Image27.jpg', inputType: 'checkbox_only', sortOrder: 7 },
    { id: 'desk_8', category: 'desks_chairs', name: '8. 圓凳樣式 8', imageUrl: '/src/assets/images/equipment/page_1_8_Image28.jpg', inputType: 'checkbox_only', sortOrder: 8 },
    
    // 學生置物櫃
    { id: 'locker_none', category: 'lockers', name: '無置物櫃', imageUrl: '', inputType: 'checkbox_only', sortOrder: 10 },
    { id: 'locker_1', category: 'lockers', name: '紅藍樣式', imageUrl: '/src/assets/images/equipment/page_1_9_Image29.jpg', inputType: 'checkbox_only', sortOrder: 11 },
    { id: 'locker_2', category: 'lockers', name: '塑膠抽屜', imageUrl: '/src/assets/images/equipment/page_1_10_Image30.jpg', inputType: 'checkbox_only', sortOrder: 12 },
    { id: 'locker_3', category: 'lockers', name: '深綠', imageUrl: '/src/assets/images/equipment/page_1_11_Image31.jpg', inputType: 'checkbox_only', sortOrder: 13 },
    { id: 'locker_4', category: 'lockers', name: '淺綠', imageUrl: '/src/assets/images/equipment/page_1_12_Image32.jpg', inputType: 'checkbox_only', sortOrder: 14 },
    { id: 'locker_5', category: 'lockers', name: '不鏽鋼', imageUrl: '/src/assets/images/equipment/page_1_13_Image33.jpg', inputType: 'checkbox_only', sortOrder: 15 },
    
    // 辦公桌 (有數量)
    { id: 'office_desk_1', category: 'office_desks', name: '辦公桌樣式 1', imageUrl: '/src/assets/images/equipment/page_1_14_Image34.jpg', inputType: 'checkbox_with_quantity', sortOrder: 21 },
    { id: 'office_desk_2', category: 'office_desks', name: '辦公桌樣式 2', imageUrl: '/src/assets/images/equipment/page_1_15_Image35.jpg', inputType: 'checkbox_with_quantity', sortOrder: 22 },
    { id: 'office_desk_3', category: 'office_desks', name: '辦公桌樣式 3', imageUrl: '/src/assets/images/equipment/page_1_16_Image36.jpg', inputType: 'checkbox_with_quantity', sortOrder: 23 },
    { id: 'office_desk_4', category: 'office_desks', name: '辦公桌樣式 4', imageUrl: '/src/assets/images/equipment/page_1_17_Image37.jpg', inputType: 'checkbox_with_quantity', sortOrder: 24 },
    { id: 'office_desk_5', category: 'office_desks', name: '辦公桌樣式 5', imageUrl: '/src/assets/images/equipment/page_1_18_Image38.jpg', inputType: 'checkbox_with_quantity', sortOrder: 25 },
    
    // 辦公椅 (有數量)
    { id: 'office_chair_1', category: 'office_chairs', name: '辦公椅樣式 1', imageUrl: '/src/assets/images/equipment/page_1_19_Image39.jpg', inputType: 'checkbox_with_quantity', sortOrder: 31 },
    { id: 'office_chair_2', category: 'office_chairs', name: '辦公椅樣式 2', imageUrl: '/src/assets/images/equipment/page_1_20_Image40.jpg', inputType: 'checkbox_with_quantity', sortOrder: 32 },
    { id: 'office_chair_3', category: 'office_chairs', name: '木椅', imageUrl: '/src/assets/images/equipment/page_1_21_Image41.jpg', inputType: 'checkbox_with_quantity', sortOrder: 33 },
    { id: 'office_chair_4', category: 'office_chairs', name: '藤椅', imageUrl: '/src/assets/images/equipment/page_1_22_Image42.jpg', inputType: 'checkbox_with_quantity', sortOrder: 34 },

    // Page 2 - Multimedia etc.
    { id: 'curtain_1', category: 'multimedia', name: '窗簾_有', imageUrl: '/src/assets/images/equipment/page_2_1_Image45.jpg', inputType: 'checkbox_only', sortOrder: 41 },
    { id: 'lectern_1', category: 'multimedia', name: '講桌_樣式1', imageUrl: '/src/assets/images/equipment/page_2_2_Image46.jpg', inputType: 'checkbox_only', sortOrder: 42 },
    { id: 'lectern_2', category: 'multimedia', name: '講桌_樣式2', imageUrl: '/src/assets/images/equipment/page_2_3_Image47.jpg', inputType: 'checkbox_only', sortOrder: 43 },
    
    // Amplifiers
    { id: 'amp_1', category: 'amplifiers', name: '擴音機 1', imageUrl: '/src/assets/images/equipment/page_2_4_Image48.jpg', inputType: 'checkbox_only', sortOrder: 51 },
    { id: 'amp_2', category: 'amplifiers', name: '擴音機 2', imageUrl: '/src/assets/images/equipment/page_2_5_Image49.jpg', inputType: 'checkbox_only', sortOrder: 52 },
    { id: 'amp_3', category: 'amplifiers', name: '擴音機 3', imageUrl: '/src/assets/images/equipment/page_2_6_Image50.jpg', inputType: 'checkbox_only', sortOrder: 53 },
    { id: 'amp_4', category: 'amplifiers', name: '擴音機 4', imageUrl: '/src/assets/images/equipment/page_2_7_Image51.jpg', inputType: 'checkbox_only', sortOrder: 54 },
    
    // Speakers
    { id: 'speaker_1', category: 'speakers', name: '喇叭 1', imageUrl: '/src/assets/images/equipment/page_2_8_Image52.jpg', inputType: 'checkbox_only', sortOrder: 61 },
    { id: 'speaker_2', category: 'speakers', name: '喇叭 2', imageUrl: '/src/assets/images/equipment/page_2_9_Image53.jpg', inputType: 'checkbox_only', sortOrder: 62 },
    { id: 'speaker_3', category: 'speakers', name: '喇叭 3', imageUrl: '/src/assets/images/equipment/page_2_10_Image54.jpg', inputType: 'checkbox_only', sortOrder: 63 },
    { id: 'speaker_4', category: 'speakers', name: '喇叭 4', imageUrl: '/src/assets/images/equipment/page_2_11_Image55.jpg', inputType: 'checkbox_only', sortOrder: 64 },

    // Erasers
    { id: 'eraser_1', category: 'erasers', name: '板擦機 1', imageUrl: '/src/assets/images/equipment/page_2_12_Image56.jpg', inputType: 'checkbox_only', sortOrder: 71 },
    { id: 'eraser_2', category: 'erasers', name: '板擦機 2', imageUrl: '/src/assets/images/equipment/page_2_13_Image57.jpg', inputType: 'checkbox_only', sortOrder: 72 },
  ];

  for (const item of items) {
    const docRef = doc(db, 'eq_items', item.id);
    if (force) {
      await setDoc(docRef, item);
    } else {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, item);
      }
    }
  }
};

export const seedClassrooms = async (force = false) => {
  const classrooms = [
    { id: 'room_101', name: '一年1班', category: 'regular', teacherName: '張曉明', teacherEmail: 'teacher1@example.com', status: 'pending' },
    { id: 'room_102', name: '一年2班', category: 'regular', teacherName: '李大華', teacherEmail: 'teacher2@example.com', status: 'pending' },
    { id: 'room_computer_1', name: '第一電腦教室', category: 'special', teacherName: '王小芬', teacherEmail: 'teacher3@example.com', status: 'pending' },
  ];

  for (const rm of classrooms) {
    const docRef = doc(db, 'eq_classrooms', rm.id);
    if (force) {
      await setDoc(docRef, rm);
    } else {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, rm);
      }
    }
  }
};

export const seedSettings = async () => {
  const docRef = doc(db, 'eq_settings', 'global');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      requireSignature: true,
      googleChatWebhookUrl: ''
    });
  }
};

export const seedAdmin = async (email) => {
  if (!email) return;
  const docRef = doc(db, 'admins', email);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      email: email,
      addedAt: new Date().toISOString()
    });
  }
};
