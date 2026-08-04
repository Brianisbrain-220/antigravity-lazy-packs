/**
 * Global Version Tagging Source of Truth
 * @version 1.0.0-b1
 * @date 2026-07-29
 */
export const VERSION_INFO = {
  version: '1.0.0-b1',
  buildDate: '2026-07-29',
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
