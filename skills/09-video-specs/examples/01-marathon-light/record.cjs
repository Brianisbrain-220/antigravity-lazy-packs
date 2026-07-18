// 用 Playwright 錄製 index.html 50 秒，輸出 webm（無音訊）
// 之後 ffmpeg 再 mux 音樂
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(__dirname, 'renders'), size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const fileUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl);
  await page.waitForTimeout(800); // 字型載入
  await page.click('#startScreen');
  console.log('Recording 51s...');
  await page.waitForTimeout(51000);
  await context.close();
  await browser.close();
  console.log('Done.');
})();
