import { doc, getDoc } from 'firebase/firestore';
import { db, isDemoMode } from './firebase';

// ============================================================================
// 校務中央權限中心接入模組 (Central Authority Hub Pilot - hubAuth.js)
// 對齊規範：2026-08-04 「校務中央權限中心」Pilot 原生接入設計
// ============================================================================

// 緊急備援管理員名單 (當中央權限表與 Firestore 皆無法連線時的最後一道防線)
const EMERGENCY_ADMINS = [
  'admin@ccps.kh.edu.tw',
  'director@ccps.kh.edu.tw'
];

const CACHE_KEY = 'ccps_hub_auth_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 分鐘快取

/**
 * 驗證並取得使用者於本系統 (park) 之授權狀態與角色
 * @param {string} email - 使用者 Google 登入 Email
 * @returns {Promise<{email: string, status: 'active'|'disabled', role: string, isAdmin: boolean, isOwner: boolean, source: 'central'|'cache'|'fallback'}>}
 */
export async function getHubAuthPermission(email) {
  if (!email) {
    return {
      email: '',
      status: 'disabled',
      role: 'USER',
      isAdmin: false,
      isOwner: false,
      source: 'fallback'
    };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. 展示 / 試玩模式 (Demo Mode) 下預設賦予管理員權限以供試用
  if (isDemoMode) {
    return {
      email: normalizedEmail,
      status: 'active',
      role: 'ADMIN',
      isAdmin: true,
      isOwner: true,
      name: '事務組管理員 (Demo)',
      source: 'fallback'
    };
  }

  // 2. 檢查 LocalStorage 15 分鐘快取 (三條降級設計 a)
  try {
    const cachedRaw = localStorage.getItem(`${CACHE_KEY}_${normalizedEmail}`);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return {
          ...cached.data,
          source: 'cache'
        };
      }
    }
  } catch (e) {
    console.warn('hubAuth: 讀取快取失敗', e);
  }

  // 3. 嘗試讀取中央權限表 `hub_grants/{email}` (優先) 或舊有 `park_admins/{email}`
  try {
    // 優先查詢中央權限中心 (hub_grants)
    const hubDocRef = doc(db, 'hub_grants', normalizedEmail);
    const hubSnap = await getDoc(hubDocRef);

    if (hubSnap.exists()) {
      const hubData = hubSnap.data();
      const parkConfig = hubData?.systems?.park || {};
      const status = hubData?.status || 'active';
      const role = parkConfig?.role || 'USER';
      const isAdmin = status === 'active' && (role === 'ADMIN' || role === 'SUPERADMIN');
      const isOwner = status === 'active' && (role === 'SUPERADMIN' || !!parkConfig?.isOwner);

      const result = {
        email: normalizedEmail,
        status,
        role,
        isAdmin,
        isOwner,
        name: hubData?.name || normalizedEmail,
        unit: hubData?.unit || '',
        title: hubData?.title || '',
        source: 'central'
      };

      // 寫入 15 分鐘快取
      saveToCache(normalizedEmail, result);
      return result;
    }

    // 相容過渡期查詢本地系統集合 (park_admins)
    const parkAdminRef = doc(db, 'park_admins', normalizedEmail);
    const parkSnap = await getDoc(parkAdminRef);
    if (parkSnap.exists()) {
      const parkData = parkSnap.data();
      const role = parkData?.role || 'ADMIN';
      const result = {
        email: normalizedEmail,
        status: 'active',
        role,
        isAdmin: true,
        isOwner: !!parkData?.isOwner,
        name: parkData?.name || normalizedEmail,
        source: 'central'
      };
      saveToCache(normalizedEmail, result);
      return result;
    }
  } catch (err) {
    console.warn('hubAuth: 雲端授權檢查異常，啟動降級防禦機制：', err);
  }

  // 4. 三條降級設計 b：緊急管理員名單比對
  if (EMERGENCY_ADMINS.includes(normalizedEmail)) {
    const fallbackAdminResult = {
      email: normalizedEmail,
      status: 'active',
      role: 'ADMIN',
      isAdmin: true,
      isOwner: true,
      name: '緊急管理員',
      source: 'fallback'
    };
    return fallbackAdminResult;
  }

  // 5. 三條降級設計 c：讀不到中央權限時「降級為一般使用者」，絕不拋錯拒絕存取
  const normalUserResult = {
    email: normalizedEmail,
    status: 'active',
    role: 'USER',
    isAdmin: false,
    isOwner: false,
    name: normalizedEmail,
    source: 'fallback'
  };

  return normalUserResult;
}

function saveToCache(email, data) {
  try {
    localStorage.setItem(
      `${CACHE_KEY}_${email}`,
      JSON.stringify({
        timestamp: Date.now(),
        data
      })
    );
  } catch (e) {
    // 忽略快取寫入異常
  }
}
