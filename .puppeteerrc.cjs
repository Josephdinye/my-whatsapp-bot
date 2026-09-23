const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // 🛠️ CLOUD FIX: Forces Puppeteer to save Chrome inside your project folder
  // instead of Render's hidden global temp directories!
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer_capsule'),
};
