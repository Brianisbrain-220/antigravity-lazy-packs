import { db, auth } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc,
  serverTimestamp, writeBatch, deleteDoc
} from 'firebase/firestore';

// ===================== USERS (借用單位/人員) =====================

export async function getUsers() {
  const snap = await getDocs(collection(db, 'users'));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const catComp = String(a.category || '').localeCompare(String(b.category || ''), 'zh-Hant');
    if (catComp !== 0) return catComp;
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant');
  });
}

export async function getUserById(id) {
  const snap = await getDoc(doc(db, 'users', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUser(data) {
  const ref = doc(collection(db, 'users'));
  await setDoc(ref, { ...data, currentCardId: null, status: 'idle', createdAt: serverTimestamp(), sortOrder: 999 });
  return ref.id;
}

export async function updateUsersBatch(updates) {
  const batch = writeBatch(db);
  updates.forEach(u => {
    batch.update(doc(db, 'users', u.id), { sortOrder: u.sortOrder });
  });
  await batch.commit();
}

export async function updateUser(id, data) {
  await updateDoc(doc(db, 'users', id), data);
}

export async function deleteUser(id) {
  await deleteDoc(doc(db, 'users', id));
}

export async function bulkImportUsers(userList) {
  const batch = writeBatch(db);
  userList.forEach(u => {
    const ref = doc(collection(db, 'users'));
    batch.set(ref, { ...u, currentCardId: null, status: 'idle', createdAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function bulkDeleteUsers(userIds) {
  const batch = writeBatch(db);
  userIds.forEach(id => {
    batch.delete(doc(db, 'users', id));
  });
  await batch.commit();
}

// ===================== CARDS (冷氣卡) =====================

export async function getCards() {
  const snap = await getDocs(collection(db, 'cards'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCardById(id) {
  const snap = await getDoc(doc(db, 'cards', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCard(cardId, data = {}) {
  await setDoc(doc(db, 'cards', cardId), {
    status: 'available',
    currentUserId: null,
    accumulatedTopUp: 0,
    lastBalance: 0,
    notes: '',
    createdAt: serverTimestamp(),
    ...data
  });
}

export async function updateCard(cardId, data) {
  await updateDoc(doc(db, 'cards', cardId), data);
}

// ===================== RECORDS (借還儲值紀錄) =====================

export async function addRecord(data) {
  const ref = await addDoc(collection(db, 'records'), {
    ...data,
    timestamp: serverTimestamp(),
    operator: auth.currentUser?.email || 'system'
  });
  return ref.id;
}

export async function getRecords(filters = {}) {
  const snap = await getDocs(collection(db, 'records'));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const tsA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
    const tsB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
    return tsB - tsA; // 降冪：最新的在前
  });
}

// ===================== BORROW (借出) =====================

export async function borrowCard(cardId, userId, dueDate) {
  const batch = writeBatch(db);
  
  // 更新卡片狀態
  batch.update(doc(db, 'cards', cardId), {
    status: 'borrowed',
    currentUserId: userId
  });
  
  // 更新借用人狀態
  batch.update(doc(db, 'users', userId), {
    currentCardId: cardId,
    status: 'borrowing'
  });
  
  await batch.commit();
  
  // 新增借出紀錄
  await addRecord({
    cardId,
    userId,
    type: 'borrow',
    amount: 0,
    dueDate: dueDate ? new Date(dueDate) : null
  });
}

// ===================== RETURN (歸還) =====================

export async function returnCard(cardId, lastBalance = 0) {
  const card = await getCardById(cardId);
  if (!card || card.status !== 'borrowed') throw new Error('此卡片目前並非借出狀態');
  
  const userId = card.currentUserId;
  const batch = writeBatch(db);
  
  batch.update(doc(db, 'cards', cardId), {
    status: 'available',
    currentUserId: null,
    lastBalance
  });
  
  batch.update(doc(db, 'users', userId), {
    currentCardId: null,
    status: 'idle'
  });
  
  await batch.commit();
  
  await addRecord({
    cardId,
    userId,
    type: 'return',
    amount: lastBalance
  });
}

// ===================== TOP-UP (儲值) =====================

export async function topUpCard(cardId, amount) {
  const card = await getCardById(cardId);
  if (!card) throw new Error('找不到此卡片');
  
  const newTotal = (card.accumulatedTopUp || 0) + amount;
  await updateCard(cardId, { accumulatedTopUp: newTotal, lastBalance: (card.lastBalance || 0) + amount });
  
  await addRecord({
    cardId,
    userId: card.currentUserId,
    type: 'topup',
    amount
  });
}

// ===================== REPLACE CARD (故障換卡) =====================

export async function replaceCard(oldCardId, newCardId) {
  const oldCard = await getCardById(oldCardId);
  if (!oldCard) throw new Error('找不到原卡片');
  
  const batch = writeBatch(db);
  
  // 新卡繼承舊卡資料
  batch.set(doc(db, 'cards', newCardId), {
    status: oldCard.status,
    currentUserId: oldCard.currentUserId,
    accumulatedTopUp: oldCard.accumulatedTopUp || 0,
    lastBalance: oldCard.lastBalance || 0,
    notes: `由舊卡 ${oldCardId} 換卡轉入`,
    replacedFrom: oldCardId,
    createdAt: serverTimestamp()
  });
  
  // 舊卡標記故障失效
  batch.update(doc(db, 'cards', oldCardId), {
    status: 'damaged',
    currentUserId: null,
    replacedTo: newCardId
  });
  
  // 更新持有人卡號
  if (oldCard.currentUserId) {
    batch.update(doc(db, 'users', oldCard.currentUserId), {
      currentCardId: newCardId
    });
  }
  
  await batch.commit();
  
  await addRecord({
    cardId: newCardId,
    userId: oldCard.currentUserId,
    type: 'replace',
    amount: 0,
    oldCardId
  });
}

// ===================== BATCH BORROW (批次借出) =====================

export async function batchBorrow(assignments, dueDate) {
  // assignments = [{ cardId, userId }, ...]
  const batch = writeBatch(db);
  const dueDateObj = dueDate ? new Date(dueDate) : null;
  
  assignments.forEach(({ cardId, userId }) => {
    batch.update(doc(db, 'cards', cardId), {
      status: 'borrowed',
      currentUserId: userId
    });
    batch.update(doc(db, 'users', userId), {
      currentCardId: cardId,
      status: 'borrowing'
    });
  });
  
  await batch.commit();
  
  // 逐筆新增借出紀錄
  const operator = auth.currentUser?.email || 'system';
  const recordPromises = assignments.map(({ cardId, userId }) =>
    addDoc(collection(db, 'records'), {
      cardId,
      userId,
      type: 'borrow',
      amount: 0,
      dueDate: dueDateObj,
      timestamp: serverTimestamp(),
      operator,
      isBatch: true
    })
  );
  await Promise.all(recordPromises);
}

// ===================== ADMINS (管理員白名單) =====================

export async function getAdmins() {
  const snap = await getDocs(collection(db, 'admins'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addAdmin(email) {
  await setDoc(doc(db, 'admins', email), { email, addedAt: serverTimestamp() });
}

export async function removeAdmin(email) {
  await deleteDoc(doc(db, 'admins', email));
}

export async function isAdmin(email) {
  if (!email) return false;
  const snap = await getDoc(doc(db, 'admins', email));
  return snap.exists();
}

// ===================== OVERDUE CHECK =====================

export async function getOverdueRecords() {
  const now = new Date();
  const snap = await getDocs(collection(db, 'records'));
  const allBorrows = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.type === 'borrow');
  
  return allBorrows
    .filter(r => {
      if (!r.dueDate) return false;
      const due = r.dueDate.toDate ? r.dueDate.toDate() : new Date(r.dueDate);
      return due < now;
    })
    .sort((a, b) => {
      const dueA = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const dueB = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
      return dueA - dueB;
    });
}

// ===================== CATEGORIES (借用類別) =====================

export async function getCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  if (list.length === 0) {
    const defaults = ['1年級', '2年級', '3年級', '4年級', '5年級', '6年級', '幼兒園', '科任教室', '臨時借用'];
    const batch = writeBatch(db);
    defaults.forEach((name, idx) => {
      const ref = doc(collection(db, 'categories'));
      batch.set(ref, { name, sortOrder: idx });
    });
    await batch.commit();
    
    const snap2 = await getDocs(collection(db, 'categories'));
    list = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  
  return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function createCategory(name) {
  const categories = await getCategories();
  const maxSort = categories.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), -1);
  const ref = doc(collection(db, 'categories'));
  await setDoc(ref, { name, sortOrder: maxSort + 1 });
  return ref.id;
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, 'categories', id));
}
