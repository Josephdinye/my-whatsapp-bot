// my-whatsapp-bot/.puppeteerrc.cjs
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer_capsule'),
};
