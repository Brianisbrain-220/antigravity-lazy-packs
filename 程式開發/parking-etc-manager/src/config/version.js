/**
 * Global Version Tagging Source of Truth
 * @version 1.0.1-b2
 * @date 2026-08-04
 * @description 資安修補:示範模式不再自動授予管理員權限(改由 VITE_DEMO_ALLOW_ADMIN 明確啟用);
 *              清空指向不存在帳號的緊急管理員名單。
 */
export const VERSION_INFO = {
  version: '1.0.1-b2',
  buildDate: '2026-08-04',
  codename: 'CCPS Smart Parking & ETC',
  schemaVersion: 1
};

export function logVersionBanner() {
  console.log(
    `%c 🚗 ${VERSION_INFO.codename} %c v${VERSION_INFO.version} (%c${VERSION_INFO.buildDate}%c) `,
    'background: #1e293b; color: #38bdf8; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
    'background: #0284c7; color: #ffffff; font-weight: bold; padding: 4px 8px;',
    'background: #0369a1; color: #e0f2fe; padding: 4px 8px;',
    'background: #0284c7; color: #ffffff; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
}
