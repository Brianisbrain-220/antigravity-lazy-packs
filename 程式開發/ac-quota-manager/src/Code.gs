/**
 * @version v1.0.0
 * Main entry point and routing.
 */

const VERSION = 'v1.0.0';

function doGet(e) {
  const mode = e.parameter.mode === 'admin' ? 'admin' : 'public';
  
  const template = HtmlService.createTemplateFromFile('Index');
  template.mode = mode;
  template.version = VERSION;
  
  return template.evaluate()
    .setTitle('冷氣時數管理系統')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
