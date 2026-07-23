/**
 * @file adminAuth.js
 * @version v1.0.0 (2026-07-23)
 * @description GAS + Firebase 雙軌管理員權限驗證抽象 API
 * 
 * 支援環境自動判定：
 * 1. GAS Web App (Session.getActiveUser() / checkGasAdminPermission)
 * 2. Firebase Auth + Firestore 'admins' Collection 白名單
 */

export const MODULE_VERSION = "v1.0.0-20260723";

/**
 * 檢查目前登入使用者的管理員權限
 * @returns {Promise<{isAdmin: boolean, email: string, role?: string, _version: string}>}
 */
export async function checkAdminPermission() {
  // 1. 判斷是否在 GAS 網頁環境中 (google.script.run)
  if (typeof google !== 'undefined' && google?.script?.run) {
    return new Promise((resolve) => {
      google.script.run
        .withSuccessHandler((res) => {
          const result = typeof res === 'object' ? res : { isAdmin: !!res, email: '' };
          resolve({ ...result, _version: MODULE_VERSION });
        })
        .withFailureHandler((err) => {
          console.error("GAS Admin Verification Failed:", err);
          resolve({ isAdmin: false, email: '', _version: MODULE_VERSION });
        })
        .checkGasAdminPermission();
    });
  }

  // 2. 判斷是否在 Firebase Auth / Firestore 環境中
  if (window.firebaseAuth && window.firestore) {
    const user = window.firebaseAuth.currentUser;
    if (!user || !user.email) {
      return { isAdmin: false, email: '', _version: MODULE_VERSION };
    }

    try {
      const docRef = window.firestore.collection('admins').doc(user.email.toLowerCase());
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        return {
          isAdmin: data.role !== 'disabled',
          email: user.email,
          role: data.role || 'admin',
          isOwner: !!data.isOwner,
          _version: MODULE_VERSION
        };
      }
    } catch (err) {
      console.error("Firestore Admin Whitelist Check Error:", err);
    }

    return { isAdmin: false, email: user.email, _version: MODULE_VERSION };
  }

  // 預設Fallback：嘗試從 Session / LocalStorage 讀取全域快取
  const cachedUser = localStorage.getItem('admin_user_session');
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      return { isAdmin: !!parsed.isAdmin, email: parsed.email || '', _version: MODULE_VERSION };
    } catch(e) {}
  }

  return { isAdmin: false, email: '', _version: MODULE_VERSION };
}

/**
 * 安全寫入登入 Session
 */
export function cacheAdminSession(userInfo) {
  try {
    localStorage.setItem('admin_user_session', JSON.stringify({
      ...userInfo,
      _version: MODULE_VERSION,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error("Failed to cache admin session:", e);
  }
}
