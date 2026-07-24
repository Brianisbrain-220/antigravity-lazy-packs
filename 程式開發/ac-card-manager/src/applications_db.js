import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

const appCol = collection(db, 'applications');

export async function getApplications() {
  const q = query(appCol, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createApplication(data) {
  const docRef = await addDoc(appCol, {
    ...data,
    status: 'pending', // pending, approved, rejected
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateApplication(id, data) {
  const ref = doc(db, 'applications', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteApplication(id) {
  const ref = doc(db, 'applications', id);
  await deleteDoc(ref);
}
